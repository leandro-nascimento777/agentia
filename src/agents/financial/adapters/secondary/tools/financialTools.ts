import type Anthropic from '@anthropic-ai/sdk'

export const FINANCIAL_TOOLS: Anthropic.Tool[] = [
  {
    name: 'check_health',
    description: 'Verifica o status dos bancos SICA e SIGOT.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_sica_tables',
    description: 'Lista todas as tabelas disponíveis no banco SICA.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_sica_table_columns',
    description: 'Retorna as colunas de uma tabela específica do banco SICA.',
    input_schema: {
      type: 'object',
      properties: { table: { type: 'string', description: 'Nome da tabela' } },
      required: ['table']
    }
  },
  {
    name: 'query_sica_table',
    description: 'Retorna dados paginados de uma tabela do banco SICA.',
    input_schema: {
      type: 'object',
      properties: {
        table:          { type: 'string' },
        page:           { type: 'integer' },
        limit:          { type: 'integer' },
        orderBy:        { type: 'string' },
        orderDirection: { type: 'string', enum: ['asc', 'desc'] }
      },
      required: ['table']
    }
  },
  {
    name: 'get_sigot_tables',
    description: 'Lista todas as tabelas disponíveis no banco SIGOT.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_sigot_table_columns',
    description: 'Retorna as colunas de uma tabela específica do banco SIGOT.',
    input_schema: {
      type: 'object',
      properties: { table: { type: 'string' } },
      required: ['table']
    }
  },
  {
    name: 'query_sigot_table',
    description: 'Retorna dados paginados de uma tabela do banco SIGOT (dados a partir de 2026).',
    input_schema: {
      type: 'object',
      properties: {
        table:          { type: 'string' },
        page:           { type: 'integer' },
        limit:          { type: 'integer' },
        orderBy:        { type: 'string' },
        orderDirection: { type: 'string', enum: ['asc', 'desc'] }
      },
      required: ['table']
    }
  },
  {
    name: 'report_air_sica_filial',
    description: 'Relatório BASE AIR SICA — Filial. Passagens aéreas emitidas pela filial (somente TICKET, excl. MPD).',
    input_schema: {
      type: 'object',
      properties: {
        startDate:       { type: 'string', description: 'Data início (YYYY-MM-DD)' },
        endDate:         { type: 'string', description: 'Data fim (YYYY-MM-DD)' },
        codigoEmpresa:   { type: 'string' },
        codigoExecutivo: { type: 'string' },
        tipoRota:        { type: 'string', description: 'DOM, INT, etc.' },
        page:            { type: 'integer' },
        limit:           { type: 'integer' },
        skipCount:       { type: 'boolean' }
      },
      required: []
    }
  },
  {
    name: 'report_air_sica_representante',
    description: 'Relatório BASE AIR SICA — Representante. Inclui TICKET + MPD.',
    input_schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string' }, endDate: { type: 'string' },
        codigoEmpresa: { type: 'string' }, codigoExecutivo: { type: 'string' },
        tipoRota: { type: 'string' }, page: { type: 'integer' },
        limit: { type: 'integer' }, skipCount: { type: 'boolean' }
      },
      required: []
    }
  },
  {
    name: 'report_non_air_sica_filial',
    description: 'Relatório BASE NON-AIR SICA — Filial. Serviços não aéreos (hotel, carro, etc.) pela filial.',
    input_schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string' }, endDate: { type: 'string' },
        codigoEmpresa: { type: 'string' }, codigoExecutivo: { type: 'string' },
        tipoProduto: { type: 'string' }, tipoRota: { type: 'string' },
        page: { type: 'integer' }, limit: { type: 'integer' }, skipCount: { type: 'boolean' }
      },
      required: []
    }
  },
  {
    name: 'report_non_air_sica_representante',
    description: 'Relatório BASE NON-AIR SICA — Representante.',
    input_schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string' }, endDate: { type: 'string' },
        codigoEmpresa: { type: 'string' }, codigoExecutivo: { type: 'string' },
        tipoProduto: { type: 'string' }, tipoRota: { type: 'string' },
        page: { type: 'integer' }, limit: { type: 'integer' }, skipCount: { type: 'boolean' }
      },
      required: []
    }
  },
  {
    name: 'report_non_air_sigot_filial',
    description: 'Relatório BASE NON-AIR SIGOT — Filial. Dados a partir de 2026.',
    input_schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string' }, endDate: { type: 'string' },
        codigoEmpresa: { type: 'string' }, tipoProduto: { type: 'string' },
        tipoRota: { type: 'string' }, page: { type: 'integer' },
        limit: { type: 'integer' }, skipCount: { type: 'boolean' }
      },
      required: []
    }
  },
  {
    name: 'report_non_air_sigot_representante',
    description: 'Relatório BASE NON-AIR SIGOT — Representante. Dados a partir de 2026.',
    input_schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string' }, endDate: { type: 'string' },
        codigoEmpresa: { type: 'string' }, tipoProduto: { type: 'string' },
        tipoRota: { type: 'string' }, page: { type: 'integer' },
        limit: { type: 'integer' }, skipCount: { type: 'boolean' }
      },
      required: []
    }
  },
  {
    name: 'report_companhia_aerea',
    description: 'Cadastro de companhias aéreas. Busca por número ou nome da cia.',
    input_schema: {
      type: 'object',
      properties: {
        numeroCia: { type: 'string' }, nomeCompanhia: { type: 'string' },
        page: { type: 'integer' }, limit: { type: 'integer' }, skipCount: { type: 'boolean' }
      },
      required: []
    }
  },
  {
    name: 'report_empresa_cadastro',
    description: 'Cadastro de empresas clientes. Filtra por código, executivo, status ativo e bloqueio de crédito.',
    input_schema: {
      type: 'object',
      properties: {
        codigoEmpresa: { type: 'string' }, codigoExecutivo: { type: 'string' },
        empresaAtiva: { type: 'string', enum: ['SIM', 'NAO'], description: 'Filtrar por empresas ativas' },
        bloqueioCredito: { type: 'string', enum: ['SIM', 'NAO'], description: 'Filtrar por bloqueio de crédito' },
        page: { type: 'integer' }, limit: { type: 'integer' }, skipCount: { type: 'boolean' }
      },
      required: []
    }
  },
  {
    name: 'report_executivo_gestor',
    description: 'Mapeamento de executivos e gestores.',
    input_schema: {
      type: 'object',
      properties: {
        codigoExecutivo: { type: 'string' },
        page: { type: 'integer' }, limit: { type: 'integer' }, skipCount: { type: 'boolean' }
      },
      required: []
    }
  },
  {
    name: 'report_bilhete_email_agencia',
    description: 'Bilhetes emitidos com e-mail da agência. Busca por data, vendedor, localizador, destino, empresa, nome ou CNPJ.',
    input_schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string' }, endDate: { type: 'string' },
        numvend: { type: 'string' }, localizador: { type: 'string' },
        destino: { type: 'string' }, codigoEmpresa: { type: 'string' },
        nchave: { type: 'string' }, nome: { type: 'string' },
        cnpj: { type: 'string' }, groupBy: { type: 'string' },
        page: { type: 'integer' }, limit: { type: 'integer' }, skipCount: { type: 'boolean' }
      },
      required: []
    }
  }
]
