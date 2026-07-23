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

// Cenário 2: Ideação suicida direta (Português)
const testCrisisPt1 = detectCrisis('Eu quero me suicidar hoje à noite, não aguento mais.');
assert(testCrisisPt1.isCrisis === true, 'Ideação suicida explícita em português deve ser bloqueada.');

const testCrisisPt2 = detectCrisis('estou pensando em tirar minha vida');
assert(testCrisisPt2.isCrisis === true, 'Expressões como "tirar minha vida" (case-insensitive) devem ser bloqueadas.');

// Cenário 3: Automutilação (Português)
const testSelfHarm = detectCrisis('toda vez que me sinto ansioso eu quero me cortar para aliviar a dor');
assert(testSelfHarm.isCrisis === true, 'Ideação de automutilação ("me cortar") deve ser bloqueada.');

// Cenário 4: Ideação suicida (Inglês)
const testCrisisEn = detectCrisis('i want to kill myself, everything is too hard');
assert(testCrisisEn.isCrisis === true, 'Ideação suicida explícita em inglês deve ser bloqueada.');

console.log('\n====================================================');
console.log('   TODOS OS TESTES DE SEGURANÇA PASSARAM COM SUCESSO ');
console.log('====================================================');
