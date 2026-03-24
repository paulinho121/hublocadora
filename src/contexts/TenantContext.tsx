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
    isLoading: boolean;
    refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType>({
    tenantId: null,
    profile: null,
    company: null,
    isAdmin: false,
    isLoading: true,
    refreshTenant: async () => {},
});

export function TenantProvider({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [company, setCompany] = useState<Company | null>(null);
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

            if (profileError) throw profileError;
            
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
                    .maybeSingle();

                if (otherProfile?.company_id) {
                    const { data: companyByEmail } = await supabase
                        .from('companies')
                        .select('*')
                        .eq('id', otherProfile.company_id)
                        .maybeSingle();

                    if (companyByEmail) {
                        currentCompany = companyByEmail as Company;
                        // Sincronizar o owner_id da empresa e o company_id do perfil atual
                        await supabase
                            .from('companies')
                            .update({ owner_id: user.id })
                            .eq('id', companyByEmail.id);
                    }
                }
            }

            // Sincronizar o perfil se encontrarmos uma empresa mas o perfil estiver desatualizado
            if (currentCompany && !currentProfile?.company_id) {
                const { data: updatedProfile } = await supabase
                    .from('profiles')
                    .update({ company_id: currentCompany.id })
                    .eq('id', user.id)
                    .select()
                    .single();
                
                if (updatedProfile) {
                    currentProfile = updatedProfile as Profile;
                }
            }

            setProfile(currentProfile);
            setCompany(currentCompany);
        } catch (error) {
            console.error('[TenantContext] Error fetching tenant data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!authLoading) {
            fetchData();
        }
    }, [user, authLoading]);

    const refreshTenant = async () => {
        await fetchData();
    };

    return (
        <TenantContext.Provider value={{ 
            tenantId: company?.id || profile?.company_id || null,
            profile, 
            company, 
            isAdmin: profile?.role === 'admin' || isMasterUser(user?.email),
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
