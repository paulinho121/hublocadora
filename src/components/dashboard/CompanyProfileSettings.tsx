import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Upload, Loader2, Link2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export function CompanyProfileSettings() {
  const { company, refreshTenant } = useTenant();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [document, setDocument] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressComplement, setAddressComplement] = useState('');
  const [addressNeighborhood, setAddressNeighborhood] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressZip, setAddressZip] = useState('');

  // Load initial values from tenant context
  useEffect(() => {
    if (company) {
      setName(company.name || '');
      setDescription(company.description || '');
      setDocument(company.document || '');
      setLogoUrl(company.logo_url || '');
      setAddressStreet(company.address_street || '');
      setAddressNumber(company.address_number || '');
      setAddressComplement(company.address_complement || '');
      setAddressNeighborhood(company.address_neighborhood || '');
      setAddressCity(company.address_city || '');
      setAddressState(company.address_state || '');
      setAddressZip(company.address_zip || '');
    }
  }, [company]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !company) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${company.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `company-logos/${fileName}`;

      // Upload to Supabase Storage images bucket
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);
      toast.success('Logomarca enviada com sucesso! Clique em salvar para confirmar.');
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast.error('Erro ao enviar logomarca: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name,
          description,
          document,
          logo_url: logoUrl || null,
          address_street: addressStreet,
          address_number: addressNumber,
          address_complement: addressComplement || null,
          address_neighborhood: addressNeighborhood,
          address_city: addressCity,
          address_state: addressState,
          address_zip: addressZip
        })
        .eq('id', company.id);

      if (error) throw error;

      // Refresh global tenant context so changes propagate everywhere instantly
      await refreshTenant();
      toast.success('Perfil da locadora atualizado com sucesso!');
    } catch (error: any) {
      console.error('Error saving company profile:', error);
      toast.error('Erro ao salvar perfil: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!company) return null;

  return (
    <Card className="clay-card">
      <CardHeader className="border-b border-white/5 pb-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-[14px] bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl font-black uppercase tracking-tighter text-zinc-100">Perfil da Locadora</CardTitle>
            <p className="text-[9px] text-zinc-500 font-black uppercase tracking-[0.25em] mt-1">Identidade Visual e Informações Cadastrais</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-8">
        <form onSubmit={handleSave} className="space-y-8">
          
          {/* Logo Upload Section */}
          <div className="flex flex-col md:flex-row items-center gap-6 p-6 rounded-2xl bg-zinc-950/40 border border-zinc-900">
            <div className="relative h-24 w-24 rounded-2xl bg-zinc-900 border-2 border-dashed border-zinc-800 flex items-center justify-center overflow-hidden shrink-0 group shadow-inner">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="Logo da Locadora" 
                  className="h-full w-full object-cover transition-transform group-hover:scale-105 duration-300"
                />
              ) : (
                <Building2 className="h-8 w-8 text-zinc-700" />
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
            </div>
            
            <div className="flex-1 space-y-3 w-full text-center md:text-left">
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-300">Logomarca Oficial</h4>
              <p className="text-[10px] text-zinc-500 font-medium leading-relaxed max-w-md">
                Envie uma imagem JPG, PNG ou WebP. Ela será exibida no cabeçalho, faturas de aluguel e nos relatórios de frota e rede.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {/* File Upload Trigger */}
                <div className="relative">
                  <input 
                    type="file" 
                    id="logo-upload"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    className="w-full h-10 border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-[10px] uppercase font-black tracking-widest gap-2 rounded-xl text-zinc-300 hover:text-white"
                  >
                    <Upload className="w-3.5 h-3.5 text-primary" /> Carregar Arquivo
                  </Button>
                </div>

                {/* Paste URL Input */}
                <div className="flex-1 relative flex items-center">
                  <Link2 className="absolute left-3.5 w-3.5 h-3.5 text-zinc-600" />
                  <Input 
                    placeholder="Ou cole a URL direta de uma imagem..."
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="h-10 pl-9 pr-4 bg-zinc-950/70 border-zinc-900 focus:border-zinc-800 rounded-xl text-[10px] text-zinc-400 font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Basic Info Section */}
          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary border-b border-white/5 pb-2">Informações Gerais</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Nome Comercial</label>
                <Input 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome Fantasia da Locadora"
                  className="h-12 bg-zinc-950/50 border-zinc-900 focus:border-zinc-800 rounded-xl text-xs font-black uppercase text-zinc-300"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Documento (CNPJ/CPF)</label>
                <Input 
                  value={document}
                  onChange={(e) => setDocument(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="h-12 bg-zinc-950/50 border-zinc-900 focus:border-zinc-800 rounded-xl text-xs font-bold text-zinc-300"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Apresentação / Descrição</label>
              <Textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva a atuação da sua locadora (ex: Especialistas em lentes anamórficas e equipamentos de iluminação profissional)"
                className="min-h-[100px] bg-zinc-950/50 border-zinc-900 focus:border-zinc-800 rounded-xl text-xs text-zinc-300 leading-relaxed font-medium"
              />
            </div>
          </div>

          {/* Address Section */}
          <div className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary border-b border-white/5 pb-2">Endereço da Sede</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-3 space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Logradouro / Avenida / Rua</label>
                <Input 
                  value={addressStreet}
                  onChange={(e) => setAddressStreet(e.target.value)}
                  placeholder="Ex: Avenida Paulista"
                  className="h-12 bg-zinc-950/50 border-zinc-900 focus:border-zinc-800 rounded-xl text-xs font-medium text-zinc-300"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Número</label>
                <Input 
                  value={addressNumber}
                  onChange={(e) => setAddressNumber(e.target.value)}
                  placeholder="Ex: 1000"
                  className="h-12 bg-zinc-950/50 border-zinc-900 focus:border-zinc-800 rounded-xl text-xs font-bold text-zinc-300"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Complemento (Opcional)</label>
                <Input 
                  value={addressComplement}
                  onChange={(e) => setAddressComplement(e.target.value)}
                  placeholder="Ex: Sala 42 / Bloco B"
                  className="h-12 bg-zinc-950/50 border-zinc-900 focus:border-zinc-800 rounded-xl text-xs font-medium text-zinc-300"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Bairro</label>
                <Input 
                  value={addressNeighborhood}
                  onChange={(e) => setAddressNeighborhood(e.target.value)}
                  placeholder="Ex: Cerqueira César"
                  className="h-12 bg-zinc-950/50 border-zinc-900 focus:border-zinc-800 rounded-xl text-xs font-medium text-zinc-300"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Cidade</label>
                <Input 
                  value={addressCity}
                  onChange={(e) => setAddressCity(e.target.value)}
                  placeholder="Ex: São Paulo"
                  className="h-12 bg-zinc-950/50 border-zinc-900 focus:border-zinc-800 rounded-xl text-xs font-medium text-zinc-300"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Estado (UF)</label>
                <Input 
                  value={addressState}
                  onChange={(e) => setAddressState(e.target.value)}
                  placeholder="Ex: SP"
                  className="h-12 bg-zinc-950/50 border-zinc-900 focus:border-zinc-800 rounded-xl text-xs font-bold text-zinc-300"
                  maxLength={2}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">CEP</label>
                <Input 
                  value={addressZip}
                  onChange={(e) => setAddressZip(e.target.value)}
                  placeholder="00000-000"
                  className="h-12 bg-zinc-950/50 border-zinc-900 focus:border-zinc-800 rounded-xl text-xs font-bold text-zinc-300"
                  required
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end pt-4 border-t border-white/5">
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-primary hover:bg-primary/95 text-black font-black uppercase tracking-widest h-12 px-8 rounded-xl shadow-[0_0_25px_rgba(var(--primary-rgb),0.25)] flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 stroke-[3]" /> Salvar Perfil
                </>
              )}
            </Button>
          </div>

        </form>
      </CardContent>
    </Card>
  );
}
