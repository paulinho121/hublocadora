import { createContext, useContext, useReducer, useEffect, useMemo, ReactNode } from 'react';
import { Equipment } from '@/types/database';
import {
  RentalSchedule, defaultSchedule, scheduleForShoot, scheduleForShootDays, clampPickup, clampReturn, dateRange, todayStr,
} from '@/lib/schedule';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProjectItem {
  equipment: Equipment;
  quantity: number;
}

interface ProjectState {
  items: ProjectItem[];
  /** Retirada (o equipamento sai da locadora) */
  startDate: string;
  /** Devolução (o equipamento volta) */
  endDate: string;
  /** Dias de gravação marcados (podem ser espaçados): só eles são cobrados */
  shootDates: string[];
  /** Primeiro e último dia de gravação */
  shootStartDate: string;
  shootEndDate: string;
  projectName: string;
  isDrawerOpen: boolean;
}

type ProjectAction =
  | { type: 'ADD_ITEM'; equipment: Equipment; quantity?: number }
  | { type: 'REMOVE_ITEM'; equipmentId: string }
  | { type: 'UPDATE_QUANTITY'; equipmentId: string; quantity: number }
  | { type: 'SET_SCHEDULE'; schedule: RentalSchedule }
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
  /** Agenda completa (retirada, gravação e devolução), já validada */
  setSchedule: (schedule: RentalSchedule) => void;
  /** Escolhe os dias de gravação; retirada e devolução são sugeridas (dias úteis) */
  setShootDays: (dates: string[]) => void;
  /** Atalho para um período contínuo de gravação */
  setShootDates: (shootStart: string, shootEnd: string) => void;
  /** Muda a retirada (vai para o dia útil válido mais próximo) */
  setPickupDate: (date: string) => void;
  /** Muda a devolução (vai para o dia útil válido mais próximo) */
  setReturnDate: (date: string) => void;
  setProjectName: (name: string) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  clearCart: () => void;
  isInCart: (equipmentId: string) => boolean;
  /** Diárias cobradas = dias de gravação */
  totalDays: number;
  estimatedTotal: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'cinehub_project_cart';

function scheduleToState(s: RentalSchedule) {
  return { startDate: s.pickupDate, endDate: s.returnDate, shootDates: s.shootDates, shootStartDate: s.shootStartDate, shootEndDate: s.shootEndDate };
}

function stateToSchedule(s: ProjectState): RentalSchedule {
  return { pickupDate: s.startDate, shootDates: s.shootDates, shootStartDate: s.shootStartDate, shootEndDate: s.shootEndDate, returnDate: s.endDate };
}

const makeDefaultState = (): ProjectState => ({
  items: [],
  ...scheduleToState(defaultSchedule()),
  projectName: '',
  isDrawerOpen: false,
});
const defaultState: ProjectState = makeDefaultState();

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
    case 'SET_SCHEDULE':
      return { ...state, ...scheduleToState(action.schedule) };
    case 'SET_PROJECT_NAME':
      return { ...state, projectName: action.name };
    case 'OPEN_DRAWER':
      return { ...state, isDrawerOpen: true };
    case 'CLOSE_DRAWER':
      return { ...state, isDrawerOpen: false };
    case 'CLEAR_CART':
      // Mantém a agenda escolhida (a pessoa costuma montar outro pedido para as mesmas datas)
      return { ...makeDefaultState(), startDate: state.startDate, endDate: state.endDate, shootDates: state.shootDates, shootStartDate: state.shootStartDate, shootEndDate: state.shootEndDate };
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
          const merged = { ...init, ...parsed, isDrawerOpen: false };
          // Carrinho salvo antes da agenda de gravação, ou com datas no passado: recalcula
          if (!parsed.shootStartDate || !parsed.shootEndDate || merged.shootStartDate < todayStr() || merged.startDate < todayStr()) {
            const shoot = merged.shootStartDate && merged.shootStartDate >= todayStr() ? merged.shootStartDate : init.shootStartDate;
            return { ...merged, ...scheduleToState(scheduleForShoot(shoot, merged.shootEndDate && merged.shootEndDate >= shoot ? merged.shootEndDate : shoot)) };
          }
          // Carrinho salvo antes dos dias espaçados: o período vira a lista de dias
          if (!Array.isArray(parsed.shootDates) || parsed.shootDates.length === 0) {
            return { ...merged, shootDates: dateRange(merged.shootStartDate, merged.shootEndDate) };
          }
          return merged;
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

  // Cobra-se só os dias de gravação marcados
  const totalDays = Math.max(1, state.shootDates.length);

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
    setSchedule:    (schedule)             => dispatch({ type: 'SET_SCHEDULE', schedule }),
    setShootDays:   (dates)                => dispatch({ type: 'SET_SCHEDULE', schedule: scheduleForShootDays(dates) }),
    setShootDates:  (shootStart, shootEnd) => dispatch({ type: 'SET_SCHEDULE', schedule: scheduleForShoot(shootStart, shootEnd) }),
    setPickupDate:  (date) => {
      const s = stateToSchedule(state);
      dispatch({ type: 'SET_SCHEDULE', schedule: { ...s, pickupDate: clampPickup(date, s) } });
    },
    setReturnDate:  (date) => {
      const s = stateToSchedule(state);
      dispatch({ type: 'SET_SCHEDULE', schedule: { ...s, returnDate: clampReturn(date, s) } });
    },
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
