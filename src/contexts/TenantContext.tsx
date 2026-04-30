import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';
import { Profile, Company } from '@/types/database';
import { isMasterUser } from '@/lib/masterUsers';

interface TenantContextType {
    tenantId: string | null;
    profile: Profile | null;
    company: Company | null;
    isAdmin: boolean;
    isBranchManager: boolean;
    branchId: string | null;
    branch: Branch | null;
    isLoading: boolean;
    refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType>({
    tenantId: null,
    profile: null,
    company: null,
    isAdmin: false,
    isBranchManager: false,
    branchId: null,
    branch: null,
    isLoading: true,
    refreshTenant: async () => {},
});

export function TenantProvider({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [company, setCompany] = useState<Company | null>(null);
    const [branchId, setBranchId] = useState<string | null>(null);
    const [branch, setBranch] = useState<Branch | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        if (!user) {
            setProfile(null);
            setCompany(null);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);

            // 1. Buscar Perfil
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (profileError) {
                console.warn('[TenantContext] Profile fetch error (non-fatal):', profileError.message);
            }
            
            let currentProfile = profileData as Profile;
            let currentCompany: Company | null = null;

            // 2. Buscar Empresa (Caminho 1: Via Company ID do perfil)
            if (currentProfile?.company_id) {
                const { data: companyData } = await supabase
                    .from('companies')
                    .select('*')
                    .eq('id', currentProfile.company_id)
                    .maybeSingle();
                
                if (companyData) {
                    currentCompany = companyData as Company;
                }
            }

            // 3. Backup: Buscar se o usuário é proprietário de alguma empresa (Caminho 2)
            if (!currentCompany) {
                const { data: ownedCompany } = await supabase
                    .from('companies')
                    .select('*')
                    .eq('owner_id', user.id)
                    .limit(1)
                    .maybeSingle();

                if (ownedCompany) {
                    currentCompany = ownedCompany as Company;
                }
            }

            // 4. Cartada Final: Buscar por e-mail (Caso o ID tenha mudado mas a conta seja a mesma)
            if (!currentCompany && user.email) {
                // Procurar outro perfil com o mesmo e-mail que possa ter o company_id
                const { data: otherProfile } = await supabase
                    .from('profiles')
                    .select('company_id')
                    .eq('email', user.email)
                    .not('company_id', 'is', null)
                    .limit(1)
                    .maybeSingle();

                if (otherProfile?.company_id) {
                    const { data: companyByEmail } = await supabase
                        .from('companies')
                        .select('*')
                        .eq('id', otherProfile.company_id)
                        .limit(1)
                        .maybeSingle();

                    if (companyByEmail) {
                        currentCompany = companyByEmail as Company;
                        // Sincronizar o owner_id da empresa - Silencioso, não deve travar o fluxo
                        supabase
                            .from('companies')
                            .update({ owner_id: user.id })
                            .eq('id', companyByEmail.id)
                            .then(({ error }) => {
                                if (error) console.warn('[TenantContext] Background sync failed (company owner):', error.message);
                            });
                    }
                }
            }

            // 5. Verificar se é um Branch Manager
            let currentBranchId: string | null = null;
            let currentBranch: Branch | null = null;
            if (user.email) {
                const { data: branchData } = await supabase
                    .from('branches')
                    .select('*')
                    .eq('manager_email', user.email)
                    .limit(1)
                    .maybeSingle();
                
                if (branchData) {
                    currentBranchId = branchData.id;
                    currentBranch = branchData as Branch;

                    // Se não encontramos empresa pelo perfil/owner, mas ele é manager de uma branch
                    // Carregamos a empresa dessa branch para que ele tenha contexto (tenantId)
                    if (!currentCompany && branchData.company_id) {
                        const { data: branchCompany } = await supabase
                            .from('companies')
                            .select('*')
                            .eq('id', branchData.company_id)
                            .limit(1)
                            .maybeSingle();
                        
                        if (branchCompany) {
                            currentCompany = branchCompany as Company;
                        }
                    }
                }
            }

            // Sincronizar o perfil se encontrarmos uma empresa mas o perfil estiver desatualizado
            // Sincronizar o perfil de forma segura
            if (currentCompany && (!currentProfile || !currentProfile.company_id)) {
                // Se o perfil existe, tentamos atualizar o company_id e o role
                if (currentProfile) {
                    supabase
                        .from('profiles')
                        .update({ 
                            company_id: currentCompany.id,
                            role: currentBranchId ? 'rental_house' : (currentProfile.role === 'client' ? 'rental_house' : currentProfile.role)
                        })
                        .eq('id', user.id)
                        .then(({ error }) => {
                            if (error) console.warn('[TenantContext] Background sync failed (profile company):', error.message);
                        });
                }
            }

            // Garante que o estado seja definido mesmo se as sincronizações falharem
            setProfile(currentProfile);
            setCompany(currentCompany);
            setBranchId(currentBranchId);
            setBranch(currentBranch);
        } catch (error) {
            console.error('[TenantContext] Fatal error in fetchData:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading) {
            fetchData();
        }
    }, [user, authLoading]);

    // Realtime: Escuta mudanças no status da empresa atual
    // Quando o admin aprova, o usuário vê automaticamente sem precisar de reload
    useEffect(() => {
        if (!company?.id) return;

        const channel = supabase
            .channel(`company_status_${company.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'companies',
                    filter: `id=eq.${company.id}`,
                },
                (payload) => {
                    console.log('[TenantContext] Company status changed via Realtime:', payload.new);
                    const newStatus = (payload.new as any)?.status;
                    if (newStatus && newStatus !== company.status) {
                        // Atualiza o estado local imediatamente
                        setCompany(prev => prev ? { ...prev, status: newStatus } : prev);
                        // Se foi aprovada, faz um refresh completo
                        if (newStatus === 'approved' || newStatus === 'active') {
                            fetchData();
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [company?.id, company?.status]);

    const refreshTenant = async () => {
        await fetchData();
    };

    return (
        <TenantContext.Provider value={{ 
            tenantId: company?.id || profile?.company_id || null,
            profile, 
            company, 
            isAdmin: profile?.role === 'admin',
            isBranchManager: !!branchId,
            branchId,
            branch,
            isLoading: isLoading || authLoading,
            refreshTenant 
        }}>
            {children}
        </TenantContext.Provider>
    );
}

export const useTenant = () => {
    const context = useContext(TenantContext);
    if (!context) {
        throw new Error('useTenant must be used within a TenantProvider');
    }
    return context;
};
