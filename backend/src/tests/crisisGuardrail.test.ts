import { detectCrisis } from '../middleware/crisisGuardrail';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FALHA: ${message}`);
    process.exit(1);
  }
  console.log(`\x1b[32m✅ PASSOU:\x1b[0m ${message}`);
}

console.log('====================================================');
console.log('   INICIANDO TESTES UNITÁRIOS DE SEGURANÇA (PSAI)   ');
console.log('====================================================\n');

// Cenário 1: Mensagens comuns de desabafo e reflexão
const testNormal1 = detectCrisis('Hoje tive um dia muito estressante no trabalho e me senti exausto.');
assert(testNormal1.isCrisis === false, 'Mensagem comum de cansaço/estresse não deve disparar alerta.');

const testNormal2 = detectCrisis('Me sinto triste ultimamente, como se estivesse sem rumo.');
assert(testNormal2.isCrisis === false, 'Mensagem comum de tristeza terapêutica não deve disparar alerta.');

const testNormal3 = detectCrisis('Preciso acabar com essa tarefa hoje antes de dar um fim no expediente.');
assert(testNormal3.isCrisis === false, 'Metáforas profissionais não devem disparar falso-positivo.');

const testNormal4 = detectCrisis('Vou cortar os gastos supérfluos do cartão e jogar bola no sábado.');
assert(testNormal4.isCrisis === false, 'Expressões comuns com cortar/jogar não devem disparar falso-positivo.');

// Cenário 2: Ideação suicida direta (Português)
const testCrisisPt1 = detectCrisis('Eu quero me suicidar hoje à noite, não aguento mais.');
assert(testCrisisPt1.isCrisis === true, 'Ideação suicida explícita em português deve ser bloqueada.');

const testCrisisPt2 = detectCrisis('estou pensando em tirar minha vida');
assert(testCrisisPt2.isCrisis === true, 'Expressões como "tirar minha vida" (case-insensitive) devem ser bloqueadas.');

const testCrisisPt3 = detectCrisis('não aguento mais viver nesse mundo, só quero acabar com a minha vida');
assert(testCrisisPt3.isCrisis === true, 'Expressões como "não aguento mais viver / acabar com a minha vida" devem ser bloqueadas.');

const testCrisisPt4 = detectCrisis('vou dar um fim na minha vida hoje');
assert(testCrisisPt4.isCrisis === true, 'Expressão "dar um fim na minha vida" deve ser bloqueada.');

// Cenário 3: Automutilação e Métodos Letais (Português)
const testSelfHarm1 = detectCrisis('toda vez que me sinto ansioso eu quero me cortar para aliviar a dor');
assert(testSelfHarm1.isCrisis === true, 'Ideação de automutilação ("me cortar") deve ser bloqueada.');

const testSelfHarm2 = detectCrisis('estou pensando em cortar meus pulsos');
assert(testSelfHarm2.isCrisis === true, 'Ideação de cortar pulsos deve ser bloqueada.');

const testLethal1 = detectCrisis('pensei em me jogar da janela do prédio');
assert(testLethal1.isCrisis === true, 'Ideação de se jogar de altura deve ser bloqueada.');

const testLethal2 = detectCrisis('vou tomar chumbinho para morrer');
assert(testLethal2.isCrisis === true, 'Ingestão de substâncias letais deve ser bloqueada.');

// Cenário 4: Ideação suicida (Inglês)
const testCrisisEn1 = detectCrisis('i want to kill myself, everything is too hard');
assert(testCrisisEn1.isCrisis === true, 'Ideação suicida explícita em inglês deve ser bloqueada.');

const testCrisisEn2 = detectCrisis('i have been having thoughts about suicide and want to end my own life');
assert(testCrisisEn2.isCrisis === true, 'Ideação em inglês "end my own life" deve ser bloqueada.');

console.log('\n====================================================');
console.log('   TODOS OS TESTES DE SEGURANÇA PASSARAM COM SUCESSO ');
console.log('====================================================');
