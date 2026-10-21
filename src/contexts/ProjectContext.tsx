import { createContext, useContext, useReducer, useEffect, useMemo, ReactNode } from 'react';
import { Equipment } from '@/types/database';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProjectItem {
  equipment: Equipment;
  quantity: number;
}

interface ProjectState {
  items: ProjectItem[];
  startDate: string;
  endDate: string;
  projectName: string;
  isDrawerOpen: boolean;
}

type ProjectAction =
  | { type: 'ADD_ITEM'; equipment: Equipment; quantity?: number }
  | { type: 'REMOVE_ITEM'; equipmentId: string }
  | { type: 'UPDATE_QUANTITY'; equipmentId: string; quantity: number }
  | { type: 'SET_DATES'; startDate: string; endDate: string }
  | { type: 'SET_PROJECT_NAME'; name: string }
  | { type: 'OPEN_DRAWER' }
  | { type: 'CLOSE_DRAWER' }
  | { type: 'CLEAR_CART' };

interface ProjectContextType {
  state: ProjectState;
  /** Adiciona ao pedido; se o item já estiver lá e vier quantidade, atualiza a quantidade */
  addItem: (equipment: Equipment, quantity?: number) => void;
  removeItem: (equipmentId: string) => void;
  updateQuantity: (equipmentId: string, quantity: number) => void;
  setDates: (startDate: string, endDate: string) => void;
  setProjectName: (name: string) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  clearCart: () => void;
  isInCart: (equipmentId: string) => boolean;
  totalDays: number;
  estimatedTotal: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'cinehub_project_cart';

const defaultState: ProjectState = {
  items: [],
  startDate: format(new Date(), 'yyyy-MM-dd'),
  endDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
  projectName: '',
  isDrawerOpen: false,
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

function projectReducer(state: ProjectState, action: ProjectAction): ProjectState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const qty = Math.max(1, Math.min(action.quantity ?? 1, action.equipment.stock_quantity || 1));
      const exists = state.items.some(i => i.equipment.id === action.equipment.id);
      if (exists) {
        if (action.quantity === undefined) return state;
        return {
          ...state,
          items: state.items.map(i => i.equipment.id === action.equipment.id ? { ...i, quantity: qty } : i),
        };
      }
      return { ...state, items: [...state.items, { equipment: action.equipment, quantity: qty }] };
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(i => i.equipment.id !== action.equipmentId) };
    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map(i =>
          i.equipment.id === action.equipmentId
            ? { ...i, quantity: Math.max(1, Math.min(action.quantity, i.equipment.stock_quantity)) }
            : i,
        ),
      };
    case 'SET_DATES':
      return { ...state, startDate: action.startDate, endDate: action.endDate };
    case 'SET_PROJECT_NAME':
      return { ...state, projectName: action.name };
    case 'OPEN_DRAWER':
      return { ...state, isDrawerOpen: true };
    case 'CLOSE_DRAWER':
      return { ...state, isDrawerOpen: false };
    case 'CLEAR_CART':
      return { ...defaultState };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ProjectContext = createContext<ProjectContextType | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    projectReducer,
    defaultState,
    (init): ProjectState => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<ProjectState>;
          return { ...init, ...parsed, isDrawerOpen: false };
        }
      } catch {
        // corrupted storage — use defaults
      }
      return init;
    },
  );

  // Persist items + dates + name; never persist drawer open state
  useEffect(() => {
    const { isDrawerOpen: _, ...toStore } = state;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch {
      // storage quota exceeded — silently ignore
    }
  }, [state]);

  const totalDays = useMemo(() => {
    const diff = differenceInDays(parseISO(state.endDate), parseISO(state.startDate));
    return Math.max(1, diff === 0 ? 1 : diff);
  }, [state.startDate, state.endDate]);

  const estimatedTotal = useMemo(
    () =>
      state.items.reduce(
        (acc, item) => acc + item.equipment.daily_rate * item.quantity * totalDays,
        0,
      ),
    [state.items, totalDays],
  );

  const value: ProjectContextType = {
    state,
    addItem:        (equipment, quantity)  => dispatch({ type: 'ADD_ITEM', equipment, quantity }),
    removeItem:     (equipmentId)          => dispatch({ type: 'REMOVE_ITEM', equipmentId }),
    updateQuantity: (equipmentId, quantity)=> dispatch({ type: 'UPDATE_QUANTITY', equipmentId, quantity }),
    setDates:       (startDate, endDate)   => dispatch({ type: 'SET_DATES', startDate, endDate }),
    setProjectName: (name)                 => dispatch({ type: 'SET_PROJECT_NAME', name }),
    openDrawer:     ()                     => dispatch({ type: 'OPEN_DRAWER' }),
    closeDrawer:    ()                     => dispatch({ type: 'CLOSE_DRAWER' }),
    clearCart:      ()                     => dispatch({ type: 'CLEAR_CART' }),
    isInCart:       (id)                   => state.items.some(i => i.equipment.id === id),
    totalDays,
    estimatedTotal,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within <ProjectProvider>');
  return ctx;
}
