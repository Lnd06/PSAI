const CRISIS_PATTERNS = [
  /\bquero\s+(me\s+)?(matar|suicidar|cortar|machucar)\b/i,
  /\bpensando\s+em\s+(me\s+)?(matar|suicidar|cortar|machucar)\b/i,
  /\bquero\s+morrer\b/i,
  /\bpensando\s+em\s+morrer\b/i,
  /\btirar\s+(a\s+)?minha\s+vida\b/i,
  /\b(não|nao)\s+quero\s+mais\s+(viver|existir)\b/i,
  /\b(dar\s+fim\s+a\s+tudo|desistir\s+de\s+viver)\b/i,
  /\bsuic[íi]dio\b/i,
  /\bauto(-)?mutila[çc][ãa]o\b/i,
  /\bme\s+auto\s*mutilar\b/i,
  /\bi\s+want\s+to\s+(die|kill\s+myself|hurt\s+myself|suicide)\b/i
];

function detectCrisis(text: string): boolean {
  for (const pattern of CRISIS_PATTERNS) {
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`\x1b[31m❌ FALHA: ${message}\x1b[0m`);
    process.exit(1);
  }
  console.log(`\x1b[32m✅ PASSOU:\x1b[0m ${message}`);
}

console.log('====================================================');
console.log('   INICIANDO TESTES DE SEGURANÇA LOCAL DO AGENTE   ');
console.log('====================================================\n');

assert(detectCrisis('Hoje tive um dia cansativo no trabalho.') === false, 'Mensagem comum de cansaço não deve disparar alerta.');
assert(detectCrisis('Me sinto triste hoje.') === false, 'Mensagem comum de tristeza não deve disparar alerta.');
assert(detectCrisis('Eu quero me suicidar hoje, não aguento mais.') === true, 'Ideação suicida explícita deve ser bloqueada.');
assert(detectCrisis('estou pensando em tirar minha vida') === true, 'Expressão "tirar minha vida" deve ser bloqueada.');
assert(detectCrisis('quero me cortar para aliviar a dor') === true, 'Automutilação ("me cortar") deve ser bloqueada.');
assert(detectCrisis('sometimes i feel like i want to die') === true, 'Expressão de ideação suicida em inglês deve ser bloqueada.');

console.log('\n====================================================');
console.log('   TODOS OS TESTES DE SEGURANÇA PASSARAM COM SUCESSO ');
console.log('====================================================');
