import { Category } from './types';

export const DEFAULT_CATEGORIES: Category[] = [
  // 1.0.00 RECEITAS
  // 1.1.00 CONTRIBUIÇÕES
  { id: '1.1.01', name: '1.1.01 Dízimos', type: 'income', budget: 0 },
  { id: '1.1.02', name: '1.1.02 Ofertas Avulsas', type: 'income', budget: 0 },
  { id: '1.1.03', name: '1.1.03 Ofertas Missionárias', type: 'income', budget: 0 },
  { id: '1.1.04', name: '1.1.04 Ofertas Construção', type: 'income', budget: 0 },
  { id: '1.1.05', name: '1.1.05 Ofertas Específicas', type: 'income', budget: 0 },
  { id: '1.1.06', name: '1.1.06 Almoço Missionário', type: 'income', budget: 0 },
  { id: '1.1.07', name: '1.1.07 Oferta IPH', type: 'income', budget: 0 },
  
  // 1.2.00 OUTRAS RECEITAS
  { id: '1.2.01', name: '1.2.01 Rendimentos', type: 'income', budget: 0 },
  { id: '1.2.02', name: '1.2.02 Venda de Bens', type: 'income', budget: 0 },
  { id: '1.2.03', name: '1.2.03 Outras Receitas', type: 'income', budget: 0 },
  { id: '1.2.04', name: '1.2.04 Juros Recebidos', type: 'income', budget: 0 },
  { id: '1.2.05', name: '1.2.05 Aluguel Chácara BE', type: 'income', budget: 0 },

  // 2.0.00 DESPESAS
  // 2.1.00 MANUTENÇÃO DE CULTO
  { id: '2.1.01', name: '2.1.01 Água e Esgoto', type: 'expense', budget: 0 },
  { id: '2.1.02', name: '2.1.02 Alimentação', type: 'expense', budget: 0 },
  { id: '2.1.03', name: '2.1.03 Combustível', type: 'expense', budget: 0 },
  { id: '2.1.04', name: '2.1.04 Congregação BE', type: 'expense', budget: 0 },
  { id: '2.1.05', name: '2.1.05 Congregação IPH', type: 'expense', budget: 0 },
  { id: '2.1.06', name: '2.1.06 Construção e Reforma', type: 'expense', budget: 0 },
  { id: '2.1.07', name: '2.1.07 Energia', type: 'expense', budget: 0 },
  { id: '2.1.08', name: '2.1.08 Escola Bíblica Dominical', type: 'expense', budget: 0 },
  { id: '2.1.09', name: '2.1.09 Junta Diaconal', type: 'expense', budget: 0 },
  { id: '2.1.10', name: '2.1.10 Limpeza e Higiene', type: 'expense', budget: 0 },
  { id: '2.1.11', name: '2.1.11 Mão de Obra', type: 'expense', budget: 0 },
  { id: '2.1.12', name: '2.1.12 Máquinas e Equipamentos', type: 'expense', budget: 0 },
  { id: '2.1.13', name: '2.1.13 Material Didático', type: 'expense', budget: 0 },
  { id: '2.1.14', name: '2.1.14 Material de Limpeza', type: 'expense', budget: 0 },
  { id: '2.1.15', name: '2.1.15 Móveis e Utensílios', type: 'expense', budget: 0 },
  { id: '2.1.16', name: '2.1.16 Música', type: 'expense', budget: 0 },
  { id: '2.1.17', name: '2.1.17 SAF', type: 'expense', budget: 0 },
  { id: '2.1.18', name: '2.1.18 UCP', type: 'expense', budget: 0 },
  { id: '2.1.19', name: '2.1.19 UMP', type: 'expense', budget: 0 },
  { id: '2.1.20', name: '2.1.20 UPA', type: 'expense', budget: 0 },
  { id: '2.1.21', name: '2.1.21 UPH', type: 'expense', budget: 0 },
  { id: '2.1.22', name: '2.1.22 Outras Despesas', type: 'expense', budget: 0 },
  { id: '2.1.23', name: '2.1.23 Viagem', type: 'expense', budget: 0 },
  { id: '2.1.24', name: '2.1.24 Doação', type: 'expense', budget: 0 },

  // 2.2.00 CÔNGRUAS E ENCARGOS
  { id: '2.2.01', name: '2.2.01 Acessórios Pastorais', type: 'expense', budget: 0 },
  { id: '2.2.02', name: '2.2.02 Adiantamento', type: 'expense', budget: 0 },
  { id: '2.2.03', name: '2.2.03 Ajuda de Custo Pastoral', type: 'expense', budget: 0 },
  { id: '2.2.04', name: '2.2.04 Côngruas Pastorais', type: 'expense', budget: 0 },
  { id: '2.2.05', name: '2.2.05 Gratificação Natalina', type: 'expense', budget: 0 },
  { id: '2.2.06', name: '2.2.06 FAP', type: 'expense', budget: 0 },
  { id: '2.2.07', name: '2.2.07 Férias Pastorais', type: 'expense', budget: 0 },
  { id: '2.2.08', name: '2.2.08 INSS', type: 'expense', budget: 0 },
  { id: '2.2.09', name: '2.2.09 IRRF', type: 'expense', budget: 0 },
  { id: '2.2.10', name: '2.2.10 Plano de Saúde', type: 'expense', budget: 0 },

  // 2.3.00 REPASSES
  { id: '2.3.01', name: '2.3.01 Presbitério - PBRF', type: 'expense', budget: 0 },
  { id: '2.3.02', name: '2.3.02 Tesouraria - SC/IPB', type: 'expense', budget: 0 },

  // 2.4.00 MISSÕES
  { id: '2.4.01', name: '2.4.01 Ajuda de Custo', type: 'expense', budget: 0 },

  // 2.5.00 ADMINISTRATIVAS E FINANCEIRAS
  { id: '2.5.01', name: '2.5.01 Contabilidade', type: 'expense', budget: 0 },
  { id: '2.5.02', name: '2.5.02 Papelaria', type: 'expense', budget: 0 },
  { id: '2.5.03', name: '2.5.03 Seminário, Cursos, Aulas', type: 'expense', budget: 0 },
  { id: '2.5.04', name: '2.5.04 Tarifa Bancária', type: 'expense', budget: 0 },
  { id: '2.5.05', name: '2.5.05 Outras Despesas', type: 'expense', budget: 0 },
  { id: '2.5.06', name: '2.5.06 Juros Pagos', type: 'expense', budget: 0 },
  { id: '2.5.07', name: '2.5.07 Desconto Concedido', type: 'expense', budget: 0 },
  { id: '2.5.08', name: '2.5.08 Despesas Legais e Acordos', type: 'expense', budget: 0 },
  { id: '2.5.09', name: '2.5.09 Tesouraria', type: 'expense', budget: 0 },
  { id: '2.5.10', name: '2.5.10 Software, Sistemas e Sites', type: 'expense', budget: 0 },
  { id: '2.5.11', name: '2.5.11 Aluguel', type: 'expense', budget: 0 },
  { id: '2.5.12', name: '2.5.12 Seguro', type: 'expense', budget: 0 },
];

export const MOCK_TRANSACTIONS = [];