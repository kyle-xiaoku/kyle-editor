/**
 * 代码块：语言登记 + 零依赖语法高亮 + 代码块 DOM 读写。
 *
 * 高亮以 <span class="ke-tok-*"> 标在内容里，只在编辑器与预览中生效；
 * 导出时 exportHtml() 会把 span 还原为纯代码，只留下语言标记
 * （<pre data-k-lang="js"><code class="language-js">…），产物干净且可再次导入。
 */
import { escapeHtml } from './sanitize.js'

/** 超过该长度不做高亮：逐字符扫描在超大粘贴下会阻塞界面 */
const MAX_HIGHLIGHT_LENGTH = 60000

/* ------------------------------ 语言登记 ------------------------------ */

const LANGUAGE_DEFS = [
  ['plaintext', '纯文本', ['text', 'txt', 'plain', 'none'], '不做着色，保留原始排版'],
  ['javascript', 'JavaScript', ['js', 'jsx', 'mjs', 'cjs', 'node'], '前端与 Node 脚本'],
  ['typescript', 'TypeScript', ['ts', 'tsx'], '带类型标注的 JS'],
  ['html', 'HTML / XML', ['xml', 'svg', 'vue', 'htm', 'markup'], '标签结构，内嵌 script / style 一并着色'],
  ['css', 'CSS', ['scss', 'less', 'sass', 'styl'], '样式表，兼容 scss / less'],
  ['json', 'JSON', ['jsonc'], '配置与接口数据'],
  ['python', 'Python', ['py'], '脚本与数据处理'],
  ['java', 'Java', ['kotlin'], '后端与安卓'],
  ['go', 'Go', ['golang'], '服务端与云原生'],
  ['rust', 'Rust', ['rs'], '系统级语言'],
  ['c', 'C / C++', ['cpp', 'c++', 'h', 'hpp', 'cc', 'objc'], '含预处理指令'],
  ['csharp', 'C#', ['cs', 'dotnet'], '.NET 体系'],
  ['php', 'PHP', [], '含 <?php ?> 标记'],
  ['ruby', 'Ruby', ['rb'], '含符号与实例变量'],
  ['sql', 'SQL', ['mysql', 'postgres', 'postgresql', 'sqlite', 'pg'], '建表与查询语句'],
  ['bash', 'Shell / Bash', ['sh', 'shell', 'zsh', 'console', 'terminal'], '命令行与脚本'],
  ['yaml', 'YAML', ['yml'], 'CI 与部署配置'],
  ['ini', 'INI / TOML', ['toml', 'conf', 'env', 'properties'], '键值配置'],
  ['markdown', 'Markdown', ['md'], '文档与说明'],
  ['diff', 'Diff / Patch', ['patch'], '代码差异'],
]

export const LANGUAGES = LANGUAGE_DEFS.map(([value, label, aliases, hint]) => ({ value, label, aliases, hint }))

const LANGUAGE_LABELS = new Map(LANGUAGES.map((item) => [item.value, item.label]))
const LANGUAGE_ALIASES = new Map()
for (const { value, aliases } of LANGUAGES) {
  LANGUAGE_ALIASES.set(value, value)
  for (const alias of aliases) LANGUAGE_ALIASES.set(alias, value)
}
/** 别名 / 大小写归一为语言主名；未知语言退化为 plaintext */
export function normalizeLang(lang) {
  const key = String(lang || '').trim().toLowerCase()
  return LANGUAGE_ALIASES.get(key) || 'plaintext'
}

export function languageLabel(lang) {
  return LANGUAGE_LABELS.get(normalizeLang(lang)) || LANGUAGE_LABELS.get('plaintext')
}

/** 可选语言清单；only 传入时按主名或别名裁剪（顺序沿用内置顺序） */
export function listLanguages(only) {
  const pick = Array.isArray(only) && only.length ? new Set(only.map(normalizeLang)) : null
  const list = LANGUAGES.filter((item) => !pick || pick.has(item.value))
  return (list.length ? list : [LANGUAGES[0]]).map(({ value, label, hint }) => ({ value, label, hint }))
}

/* ------------------------------ 词法规则 ------------------------------ */

// 空白与换行分开处理：跨行吞掉缩进会让 ^（多行）锚点规则永远匹配不上
const SPACE = { re: /[^\S\n]+/y, cls: null }
const NEWLINE = { re: /\n/y, cls: null }
const BLANK = [SPACE, NEWLINE]
const IDENT = { re: /[A-Za-z_$][\w$]*/y, cls: null }
const NUM = {
  re: /(?:0[xX][\da-fA-F](?:_?[\da-fA-F])*|0[bB][01](?:_?[01])*|0[oO][0-7](?:_?[0-7])*|\d(?:_?\d)*(?:\.(?:\d(?:_?\d)*)?)?(?:[eE][+-]?\d+)?)[a-zA-Z]*/y,
  cls: 'num',
}
const C_TYPE = { re: /[A-Z][A-Za-z0-9_]*/y, cls: 'typ' }
const CALL = { re: /[A-Za-z_$][\w$]*(?=\s*\()/y, cls: 'fn' }
const PUNCT = { re: /[{}[\]();,.]+/y, cls: 'op' }
const OP = { re: /[+\-*/%=!<>&|^~?:@]+/y, cls: 'op' }
const BLOCK_COMMENT = { re: /\/\*[\s\S]*?(?:\*\/|$)/y, cls: 'com' }
const LINE_COMMENT = { re: /\/\/[^\n]*/y, cls: 'com' }
const DQ_STRING = { re: /"(?:\\[\s\S]|[^\\"\n])*"/y, cls: 'str' }
const SQ_STRING = { re: /'(?:\\[\s\S]|[^\\'\n])*'/y, cls: 'str' }
const C_STRING = [
  DQ_STRING,
  SQ_STRING,
  { re: /`(?:\\[\s\S]|[^\\`])*`/y, cls: 'str' },
]

const kw = (words, flags = 'y') => ({ re: new RegExp(`\\b(?:${words})\\b`, flags), cls: 'kw' })
const typ = (words, flags = 'y') => ({ re: new RegExp(`\\b(?:${words})\\b`, flags), cls: 'typ' })
const bool = (words) => ({ re: new RegExp(`\\b(?:${words})\\b`, 'y'), cls: 'bool' })
/** 紧跟 def / func / class 等关键字之后的标识符按函数名着色 */
const nameAfter = (words) => ({
  re: /[A-Za-z_$][\w$]*/y,
  cls: 'fn',
  when: (prev) => words.includes(prev),
})

const JS_BUILTINS = typ('Object|Array|String|Number|Boolean|Symbol|BigInt|Promise|Map|Set|WeakMap|WeakSet|RegExp|Date|Math|JSON|Error|AggregateError|TypeError|RangeError|SyntaxError|Function|Proxy|Reflect|Intl|console|window|document|globalThis|process|require|module|exports')

const RULES = {
  plaintext: null,

  javascript: [
    ...BLANK,
    BLOCK_COMMENT,
    LINE_COMMENT,
    { re: /`(?:\\[\s\S]|\$\{(?:[^{}]|\{[^{}]*\})*\}|[^\\`])*`/y, cls: 'str' }, // 模板串（含简单插值）
    DQ_STRING,
    SQ_STRING,
    { re: /\/(?![/*\s])(?:\\.|\[(?:\\.|[^\]\n])*\]|[^\\/\n])*\/[a-z]*/y, cls: 'str' }, // 正则字面量
    bool('true|false|null|undefined|NaN|Infinity'),
    kw('break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|function|if|import|in|instanceof|let|new|return|super|switch|this|throw|try|typeof|var|void|while|with|yield|async|await|of|static|get|set|as|from|delete'),
    JS_BUILTINS,
    C_TYPE,
    CALL,
    NUM,
    IDENT,
    OP,
    PUNCT,
  ],

  typescript: [
    ...BLANK,
    BLOCK_COMMENT,
    LINE_COMMENT,
    { re: /`(?:\\[\s\S]|\$\{(?:[^{}]|\{[^{}]*\})*\}|[^\\`])*`/y, cls: 'str' },
    DQ_STRING,
    SQ_STRING,
    bool('true|false|null|undefined|NaN|Infinity'),
    kw('abstract|any|as|asserts|async|await|break|case|catch|class|const|constructor|continue|declare|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|infer|instanceof|interface|is|keyof|let|namespace|new|of|private|protected|public|readonly|return|satisfies|set|static|super|switch|this|throw|try|type|typeof|unique|var|void|while|with|yield'),
    JS_BUILTINS,
    C_TYPE,
    CALL,
    NUM,
    IDENT,
    OP,
    PUNCT,
  ],

  json: [
    ...BLANK,
    { re: /"(?:\\.|[^\\"\n])*"(?=\s*:)/y, cls: 'key' },
    { re: /"(?:\\.|[^\\"\n])*"/y, cls: 'str' },
    bool('true|false|null'),
    NUM,
    IDENT,
    PUNCT,
  ],

  css: [
    ...BLANK,
    BLOCK_COMMENT,
    LINE_COMMENT,
    { re: /@[\w-]+/y, cls: 'kw' },
    DQ_STRING,
    SQ_STRING,
    { re: /#[0-9a-fA-F]{3,8}\b/y, cls: 'num' },
    { re: /[\w-]+(?=\s*\()/y, cls: 'fn' },
    { re: /!important\b/y, cls: 'kw' },
    { re: /[\w-]+(?=\s*:)/y, cls: 'prop' },
    { re: /\.[a-zA-Z_-][\w-]*|#[\w-]+|::?[\w-]+|\[[^\]]*\]|\*|&/y, cls: 'sel' },
    { re: /\b\d+(?:\.\d+)?(?:px|em|rem|ex|ch|vh|vw|vmin|vmax|%|s|ms|deg|turn|fr|pt|cm|mm|in|dpi)\b/y, cls: 'num' },
    { re: /\b(?:solid|dashed|dotted|double|none|auto|absolute|relative|fixed|sticky|static|block|inline|inline-block|flex|grid|hidden|visible|inherit|initial|unset|currentColor|bold|italic|uppercase|lowercase|center|left|right|top|bottom|middle|wrap|nowrap|pointer|cursor|scroll|contain|cover)\b/y, cls: 'typ' },
    IDENT,
    NUM,
    OP,
    PUNCT,
  ],

  python: [
    ...BLANK,
    { re: /#[^\n]*/y, cls: 'com' },
    { re: /'''[\s\S]*?'''|"""[\s\S]*?"""/y, cls: 'str' },
    { re: /[rbfu]{0,2}'(?:\\.|[^\\'\n])*'|[rbfu]{0,2}"(?:\\.|[^\\"\n])*"/y, cls: 'str' },
    { re: /@[\w.]+/y, cls: 'meta' },
    bool('True|False|None'),
    kw('and|as|assert|async|await|break|case|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|match|nonlocal|not|or|pass|raise|return|try|while|with|yield'),
    typ('print|len|range|str|int|float|bool|list|dict|set|tuple|type|isinstance|enumerate|zip|map|filter|sorted|sum|min|max|abs|round|open|super|object|Exception|ValueError|TypeError|KeyError|IndexError|AttributeError|RuntimeError|StopIteration'),
    C_TYPE,
    CALL,
    NUM,
    IDENT,
    OP,
    PUNCT,
  ],

  java: [
    ...BLANK,
    BLOCK_COMMENT,
    LINE_COMMENT,
    C_STRING[0],
    C_STRING[1],
    { re: /@[\w.]+/y, cls: 'meta' },
    bool('true|false|null'),
    kw('abstract|assert|break|case|catch|class|const|continue|default|do|else|enum|extends|final|finally|for|goto|if|implements|import|instanceof|interface|native|new|package|private|protected|public|record|return|sealed|static|strictfp|super|switch|synchronized|this|throw|throws|transient|try|var|volatile|while|yield'),
    typ('boolean|byte|char|double|float|int|long|short|void|String|Integer|Long|Double|Float|Boolean|Character|Object|List|Map|Set|ArrayList|HashMap|HashSet|Optional|Stream|Override|Deprecated|System|Math|Thread|Exception|RuntimeException'),
    nameAfter(['class', 'interface', 'enum', 'record', 'new']),
    C_TYPE,
    CALL,
    NUM,
    IDENT,
    OP,
    PUNCT,
  ],

  go: [
    ...BLANK,
    BLOCK_COMMENT,
    LINE_COMMENT,
    { re: /`[^`]*`/y, cls: 'str' },
    DQ_STRING,
    SQ_STRING,
    bool('true|false|nil|iota'),
    kw('break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go|goto|if|import|interface|map|package|range|return|select|struct|switch|type|var'),
    typ('any|bool|byte|comparable|complex64|complex128|error|float32|float64|int|int8|int16|int32|int64|rune|string|uint|uint8|uint16|uint32|uint64|uintptr'),
    nameAfter(['func', 'type', 'struct', 'interface']),
    C_TYPE,
    CALL,
    NUM,
    IDENT,
    OP,
    PUNCT,
  ],

  rust: [
    ...BLANK,
    BLOCK_COMMENT,
    LINE_COMMENT,
    DQ_STRING,
    { re: /'(?:\\.|[^\\'])'/y, cls: 'str' }, // 字符字面量（必须先于生命周期，否则 'a' 会被吃掉）
    { re: /'[A-Za-z_]\w*/y, cls: 'meta' }, // 生命周期 'a
    { re: /(?:r|b)?#*"(?:\\[\s\S]|[^\\"])*"#*/y, cls: 'str' },
    { re: /#!?\[[^\]]*\]/y, cls: 'meta' },
    bool('true|false|None|Some|Ok|Err'),
    kw('as|async|await|break|const|continue|crate|dyn|else|enum|extern|fn|for|if|impl|in|let|loop|match|mod|move|mut|pub|ref|return|self|Self|static|struct|super|trait|type|unsafe|use|where|while'),
    typ('bool|char|f32|f64|i8|i16|i32|i64|i128|isize|str|u8|u16|u32|u64|u128|usize|String|Vec|Option|Result|Box|Rc|Arc|RefCell|HashMap|HashSet|BTreeMap|Self'),
    nameAfter(['fn', 'struct', 'enum', 'trait', 'impl', 'mod']),
    C_TYPE,
    CALL,
    NUM,
    IDENT,
    OP,
    PUNCT,
  ],

  c: [
    { re: /^[ \t]*#[ \t]*\w+[^\n]*/my, cls: 'meta' },
    ...BLANK,
    BLOCK_COMMENT,
    LINE_COMMENT,
    C_STRING[0],
    C_STRING[1],
    bool('true|false|nullptr|NULL|stdin|stdout|stderr'),
    kw('alignas|alignof|asm|auto|break|case|catch|class|const|constexpr|continue|decltype|default|delete|do|dynamic_cast|else|enum|explicit|export|extern|final|for|friend|goto|if|inline|mutable|namespace|new|noexcept|operator|override|private|protected|public|register|return|sizeof|static|static_cast|struct|switch|template|this|throw|try|typedef|typename|union|using|virtual|volatile|while'),
    typ('bool|char|double|float|int|long|short|signed|unsigned|void|wchar_t|size_t|uint8_t|uint16_t|uint32_t|uint64_t|int8_t|int16_t|int32_t|int64_t|FILE|string|cout|cin|cerr|endl|std|vector|map|set'),
    nameAfter(['struct', 'class', 'enum', 'union', 'namespace']),
    C_TYPE,
    CALL,
    NUM,
    IDENT,
    OP,
    PUNCT,
  ],

  csharp: [
    { re: /^[ \t]*#[ \t]*\w+[^\n]*/my, cls: 'meta' },
    ...BLANK,
    BLOCK_COMMENT,
    LINE_COMMENT,
    { re: /\$?"(?:""|\\.|[^\\"\n])*"/y, cls: 'str' },
    C_STRING[1],
    bool('true|false|null'),
    kw('abstract|as|async|await|base|break|case|catch|checked|class|const|continue|default|delegate|do|else|enum|event|explicit|extern|finally|fixed|for|foreach|goto|if|implicit|in|interface|internal|is|lock|namespace|new|operator|out|override|params|private|protected|public|readonly|record|ref|return|sealed|sizeof|stackalloc|static|struct|switch|this|throw|try|typeof|unchecked|unsafe|using|var|virtual|volatile|when|where|while|yield'),
    typ('bool|byte|char|decimal|double|dynamic|float|int|long|object|sbyte|short|string|uint|ulong|ushort|void|Task|List|Dictionary|IEnumerable|Action|Func|Exception|Console|String|Int32|Enumerable'),
    nameAfter(['class', 'struct', 'interface', 'enum', 'namespace', 'new']),
    C_TYPE,
    CALL,
    NUM,
    IDENT,
    OP,
    PUNCT,
  ],

  php: [
    ...BLANK,
    { re: /<\?php|\?>|<\?=/y, cls: 'meta' },
    BLOCK_COMMENT,
    LINE_COMMENT,
    { re: /#[^\n]*/y, cls: 'com' },
    DQ_STRING,
    SQ_STRING,
    { re: /\$[A-Za-z_]\w*/y, cls: 'var' },
    bool('true|false|null|TRUE|FALSE|NULL'),
    kw('abstract|and|array|as|break|callable|case|catch|class|clone|const|continue|declare|default|do|echo|else|elseif|empty|enddeclare|endfor|endforeach|endif|endswitch|endwhile|enum|extends|final|finally|fn|for|foreach|function|global|goto|if|implements|include|include_once|instanceof|insteadof|interface|isset|list|match|namespace|new|or|print|private|protected|public|readonly|require|require_once|return|static|switch|throw|trait|try|unset|use|var|while|xor|yield'),
    typ('int|float|string|bool|array|object|mixed|void|iterable|self|parent|Closure|Exception|DateTime|stdClass|Countable|JsonSerializable|strlen|count|implode|explode|array_map|array_filter|sprintf|printf|json_encode|json_decode'),
    CALL,
    NUM,
    IDENT,
    OP,
    PUNCT,
  ],

  ruby: [
    { re: /^=begin[\s\S]*?^=end[^\n]*/my, cls: 'com' },
    ...BLANK,
    { re: /#[^\n]*/y, cls: 'com' },
    DQ_STRING,
    SQ_STRING,
    { re: /%[wWiI][([{][^)\]}]*[)\]}]/y, cls: 'str' },
    { re: /@@?[A-Za-z_]\w*|\$[A-Za-z_]\w*/y, cls: 'var' },
    { re: /:[A-Za-z_]\w*[?!]?/y, cls: 'typ' },
    bool('true|false|nil|__FILE__|__LINE__'),
    kw('alias|and|begin|break|case|class|def|defined|do|else|elsif|end|ensure|for|if|in|module|next|not|or|raise|redo|rescue|retry|return|self|super|then|undef|unless|until|when|while|yield|lambda|proc|new|attr_accessor|attr_reader|attr_writer|require|require_relative|include|extend|puts|print|p|loop|freeze|respond_to|instance_variable_get|send|tap|each|map|select|reject|reduce|inject|push|pop|shift|unshift|join|split|to_s|to_i|to_a|to_h|nil?|empty?'),
    C_TYPE,
    nameAfter(['def', 'class', 'module']),
    CALL,
    NUM,
    IDENT,
    OP,
    PUNCT,
  ],

  sql: [
    ...BLANK,
    { re: /--[^\n]*/y, cls: 'com' },
    BLOCK_COMMENT,
    { re: /'[^']*(?:''[^']*)*'/y, cls: 'str' },
    { re: /"[^"]*"|`[^`]*`/y, cls: 'var' },
    { re: /\$\$[\s\S]*?\$\$/y, cls: 'str' },
    bool('true|false|null', 'iy'),
    kw('add|all|alter|and|as|asc|begin|between|by|case|cast|column|commit|constraint|create|cross|database|default|delete|desc|distinct|drop|else|end|except|exists|foreign|from|full|group|having|if|in|index|inner|insert|intersect|into|is|join|key|left|like|limit|not|null|offset|on|or|order|outer|primary|references|right|rollback|select|set|table|then|top|transaction|truncate|union|unique|update|values|view|when|where|with', 'iy'),
    typ('bigint|bit|blob|boolean|char|date|datetime|decimal|double|enum|float|int|integer|json|jsonb|longtext|numeric|real|serial|smallint|text|time|timestamp|tinyint|uuid|varchar|count|sum|avg|min|max|coalesce|nullif|now|current_date|current_timestamp|concat|substring|trim|upper|lower|length|round|abs|group_concat|string_agg|row_number|rank', 'iy'),
    CALL,
    NUM,
    IDENT,
    OP,
    PUNCT,
  ],

  bash: [
    { re: /^#![^\n]*/my, cls: 'meta' },
    ...BLANK,
    { re: /#[^\n]*/y, cls: 'com' },
    { re: /'[^']*'/y, cls: 'str' },
    { re: /\$?"(?:\\[\s\S]|[^\\"\n])*"/y, cls: 'str' },
    { re: /\$\{[^}\n]*\}|\$\(|\$[A-Za-z_]\w*|\$[0-9@*#?$!-]/y, cls: 'var' },
    kw('if|then|else|elif|fi|for|in|do|done|while|until|case|esac|function|select|time|return|local|export|declare|readonly|unset|shift|source|exit|trap|set|eval|exec|alias|break|continue'),
    typ('echo|printf|read|cd|pwd|test|cat|ls|cp|mv|rm|mkdir|rmdir|touch|chmod|chown|grep|egrep|sed|awk|sort|uniq|head|tail|wc|cut|tr|xargs|find|which|curl|wget|git|npm|npx|yarn|pnpm|node|python|pip|docker|kubectl|ssh|scp|tar|zip|unzip|make|sudo|apt|brew|systemctl|journalctl|ps|kill|df|du|env|sleep|date|basename|dirname|realpath|mktemp'),
    { re: /\{\d+(?:,\d*)?\}/y, cls: 'num' },
    NUM,
    { re: /--?[A-Za-z][\w-]*/y, cls: 'attr' },
    IDENT,
    OP,
    PUNCT,
  ],

  yaml: [
    { re: /^---[^\n]*|^\.\.\.[^\n]*/my, cls: 'meta' },
    { re: /^[ \t]*-[ \t]/my, cls: 'kw' },
    ...BLANK,
    { re: /#[^\n]*/y, cls: 'com' },
    { re: /[|>][-+]?\d*\s*(?=\n|$)/y, cls: 'meta' },
    { re: /(?<![\w$])&[\w.-]+|\*[\w.-]+/y, cls: 'var' },
    { re: /!!?[\w:.-]+/y, cls: 'meta' },
    bool('true|false|null|yes|no|on|off|True|False|Null|~', 'y'),
    { re: /[\w$.-]+(?=\s*:(?:\s|$))/y, cls: 'key' },
    DQ_STRING,
    SQ_STRING,
    NUM,
    IDENT,
    OP,
    PUNCT,
  ],

  ini: [
    ...BLANK,
    { re: /[#;][^\n]*/y, cls: 'com' },
    { re: /\[[^\]\n]*\]/y, cls: 'kw' },
    { re: /"""[\s\S]*?"""|'''[\s\S]*?'''/y, cls: 'str' },
    DQ_STRING,
    SQ_STRING,
    bool('true|false|yes|no|on|off', 'iy'),
    { re: /[\w$.-]+(?=\s*=(?!=))/y, cls: 'key' },
    { re: /\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?/y, cls: 'num' },
    NUM,
    IDENT,
    OP,
    PUNCT,
  ],

  markdown: [
    { re: /^[ \t]*```[^\n]*\n[\s\S]*?^[ \t]*```[ \t]*$/my, cls: 'str' },
    { re: /^[ \t]*```[^\n]*/my, cls: 'str' },
    { re: /^#{1,6}[ \t][^\n]*/my, cls: 'kw' },
    { re: /^[ \t]*>[^\n]*/my, cls: 'com' },
    { re: /^[ \t]*(?:-{3,}|\*{3,}|_{3,})[ \t]*$/my, cls: 'com' },
    { re: /^[ \t]*(?:[-*+][ \t]|\d+\.[ \t])/my, cls: 'kw' },
    ...BLANK,
    { re: /!?\[[^\]\n]*\]\([^)\n]*\)/y, cls: 'str' },
    { re: /`[^`\n]+`/y, cls: 'str' },
    { re: /\*\*[^*\n]+\*\*|__[^_\n]+__/y, cls: 'typ' },
    { re: /\*[^*\n]+\*/y, cls: 'var' },
    { re: /https?:\/\/[^\s)]+/y, cls: 'fn' },
    { re: /<\/?[A-Za-z][^>\n]*>/y, cls: 'tag' },
    PUNCT,
  ],

  diff: [
    { re: /^(?:diff|index|new file|deleted file|similarity|rename|Binary files)[^\n]*/my, cls: 'meta' },
    { re: /^(?:---|\+\+\+)[^\n]*/my, cls: 'meta' },
    { re: /^@@[^\n]*/my, cls: 'kw' },
    { re: /^\+[^\n]*/my, cls: 'ins' },
    { re: /^-[^\n]*/my, cls: 'del' },
    { re: /^\\[^\n]*/my, cls: 'com' },
    ...BLANK,
    IDENT,
    PUNCT,
  ],
}

/* ------------------------------ 扫描器 ------------------------------ */

/**
 * 逐字符扫描：命中规则即包一层 span，未命中的字符原样累积。
 * 规则表按顺序尝试（sticky 正则保证只在当前位置匹配），因此顺序即优先级。
 */
function scan(code, rules) {
  let out = ''
  let plain = ''
  let prev = ''
  let index = 0

  const flush = () => {
    if (plain) {
      out += escapeHtml(plain)
      plain = ''
    }
  }

  while (index < code.length) {
    let hit = null
    let match = null
    for (const rule of rules) {
      if (rule.when && !rule.when(prev)) continue
      rule.re.lastIndex = index
      const found = rule.re.exec(code)
      if (found && found[0]) {
        hit = rule
        match = found
        break
      }
    }
    if (!match) {
      plain += code[index]
      index += 1
      continue
    }
    const text = match[0]
    if (hit.cls) {
      flush()
      out += `<span class="ke-tok-${hit.cls}">${escapeHtml(text)}</span>`
    } else {
      plain += text
    }
    const trimmed = text.trim()
    if (trimmed) prev = trimmed
    index += text.length
  }
  flush()
  return out
}

/* ------------------------------ HTML ------------------------------ */

const HTML_TAG_START = /<\/?([A-Za-z][\w:.-]*)/y

/** 标签内部逐段取出属性名 / 属性值 / 结束符，避免通用规则把标签外的文本当成属性 */
function scanTag(code, start, out, emit) {
  let index = start
  let closed = false
  while (index < code.length) {
    const rest = code.slice(index)
    let found = /^[\s]+/.exec(rest)
    if (found) {
      emit(null, found[0])
      index += found[0].length
      continue
    }
    found = /^\/?>/.exec(rest)
    if (found) {
      emit('tag', found[0])
      index += found[0].length
      closed = true
      break
    }
    found = /^[^\s=/>]+/.exec(rest)
    if (found) {
      emit('attr', found[0])
      index += found[0].length
      continue
    }
    found = /^=/.exec(rest)
    if (found) {
      emit('op', found[0])
      index += found[0].length
      continue
    }
    emit(null, code[index])
    index += 1
  }
  void out
  return { index, closed }
}

function highlightHtml(code) {
  let out = ''
  let plain = ''
  let index = 0
  const flush = () => {
    if (plain) {
      out += escapeHtml(plain)
      plain = ''
    }
  }
  const emit = (cls, text, raw = false) => {
    if (cls) {
      flush()
      out += raw ? text : `<span class="ke-tok-${cls}">${escapeHtml(text)}</span>`
    } else {
      plain += text
    }
  }

  while (index < code.length) {
    const rest = code.slice(index)
    let found = /^<!--[\s\S]*?(?:-->|$)/.exec(rest)
    if (found) {
      emit('com', found[0])
      index += found[0].length
      continue
    }
    found = /^<!\[CDATA\[[\s\S]*?(?:\]\]>|$)/.exec(rest)
    if (found) {
      emit('str', found[0])
      index += found[0].length
      continue
    }
    found = /^<[!?][^>]*/.exec(rest)
    if (found) {
      emit('meta', found[0])
      index += found[0].length
      continue
    }
    HTML_TAG_START.lastIndex = index
    found = HTML_TAG_START.exec(code)
    if (found) {
      emit('tag', found[0])
      index += found[0].length
      const tagName = found[1].toLowerCase()
      const tag = scanTag(code, index, out, emit)
      index = tag.index
      // <script> / <style> 内部按对应语言高亮，嵌套高亮结果已是转义好的 HTML
      if (tag.closed && (tagName === 'script' || tagName === 'style')) {
        const closeAt = code.toLowerCase().indexOf(`</${tagName}`, index)
        if (closeAt > index) {
          emit('raw', highlightCode(code.slice(index, closeAt), tagName === 'script' ? 'javascript' : 'css'), true)
          index = closeAt
        }
      }
      continue
    }
    found = /^&[#\w]+;/.exec(rest)
    if (found) {
      emit('num', found[0])
      index += found[0].length
      continue
    }
    plain += code[index]
    index += 1
  }
  flush()
  return out
}

/* ------------------------------ 对外入口 ------------------------------ */

/** 把代码字符串转成高亮 HTML（结果已转义） */
export function highlightCode(code, lang) {
  const text = String(code == null ? '' : code)
  const name = normalizeLang(lang)
  if (name === 'plaintext') return escapeHtml(text)
  if (text.length > MAX_HIGHLIGHT_LENGTH) return escapeHtml(text) // 超大文本直接放弃着色，避免卡界面
  if (name === 'html') return highlightHtml(text)
  const rules = RULES[name]
  return rules ? scan(text, rules) : escapeHtml(text)
}

/* ------------------------------ 代码块 DOM ------------------------------ */

export function isCodeBlock(node) {
  if (!node || node.nodeType !== 1 || node.tagName !== 'PRE') return false
  if (node.hasAttribute('data-k-lang')) return true
  return Array.from(node.children).some((child) => child.tagName === 'CODE')
}

/** 从选区（默认当前选区）向上找到所在的代码块 */
export function codeBlockAt(root, container) {
  let node = container || (window.getSelection()?.rangeCount ? window.getSelection().getRangeAt(0).startContainer : null)
  if (!node || !root || !root.contains(node)) return null
  while (node && node !== root) {
    if (node.nodeType === 1 && node.tagName === 'PRE') return isCodeBlock(node) ? node : null
    node = node.parentNode
  }
  return null
}

export function codeElementOf(pre) {
  const exist = Array.from(pre.children).find((child) => child.tagName === 'CODE')
  if (exist) return exist
  const code = document.createElement('code')
  while (pre.firstChild) code.appendChild(pre.firstChild)
  pre.appendChild(code)
  return code
}

/** 代码块语言：优先读 data-k-lang，其次认标准的 class="language-x"（外部 HTML 导入） */
export function languageOf(pre) {
  if (!pre) return ''
  const marked = pre.getAttribute('data-k-lang')
  if (marked) return normalizeLang(marked)
  const code = Array.from(pre.children).find((child) => child.tagName === 'CODE')
  const matched = /(?:^|\s)language-([\w+#-]+)/.exec(code?.className || '')
  return matched ? normalizeLang(matched[1]) : ''
}

/** 写入语言标记：data-k-lang 供编辑器识别，class="language-x" 让产物符合通行约定 */
export function applyLanguage(pre, lang) {
  const value = normalizeLang(lang)
  const code = codeElementOf(pre)
  pre.setAttribute('data-k-lang', value)
  const classes = (code.className || '').split(/\s+/).filter((name) => name && !/^language-/.test(name))
  if (value !== 'plaintext') classes.push(`language-${value}`)
  code.className = classes.join(' ')
  if (!code.className) code.removeAttribute('class')
  return value
}

/** 读取代码纯文本：<br> 与块级子节点还原为换行，避免再次高亮时丢掉行 */
export function codeTextOf(codeEl) {
  const clone = codeEl.cloneNode(true)
  clone.querySelectorAll('br').forEach((br) => br.replaceWith('\n'))
  clone.querySelectorAll('div, p').forEach((node) => node.replaceWith(document.createTextNode(`\n${node.textContent}`)))
  return clone.textContent.replace(/\u00a0/g, ' ')
}

/** 选区在代码块内的偏移：按“规范化文本”计数，<br>/<div>/<p> 都算一个换行
 *  （重渲染后光标必须落在 <br> 之后，否则回车会被吞到光标前面） */
function caretOffsetIn(el) {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return null
  const range = sel.getRangeAt(0)
  if (!el.contains(range.startContainer)) return null
  const before = document.createRange()
  before.selectNodeContents(el)
  before.setEnd(range.startContainer, range.startOffset)
  return codeTextOf(before.cloneContents())
}

function setCaretOffsetIn(el, offset) {
  const sel = window.getSelection()
  if (!sel) return
  const apply = (node, pos) => {
    if (!node) return
    const range = document.createRange()
    if (node.nodeType === 3) range.setStart(node, Math.max(0, Math.min(node.data.length, pos)))
    else range.setStartAfter(node)
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
  }
  let seen = 0
  let done = false
  const walk = (node) => {
    const children = Array.from(node.childNodes)
    for (const child of children) {
      if (child.nodeType === 3) {
        const len = child.data.length
        if (seen + len >= offset) {
          apply(child, offset - seen)
          return true
        }
        seen += len
      } else if (child.nodeType === 1) {
        if (child.tagName === 'BR') {
          if (seen + 1 >= offset) {
            apply(child)
            return true
          }
          seen += 1
        } else if (child.tagName === 'DIV' || child.tagName === 'P') {
          seen += 1 // 块级子节点前面隐含一个换行
          if (walk(child)) return true
        } else if (walk(child)) {
          return true
        }
      }
    }
    return false
  }
  done = walk(el)
  if (!done) {
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(false)
    sel.removeAllRanges()
    sel.addRange(range)
  }
}

/** 重新渲染单个代码块；caret 为 true 时保持块内光标位置（在代码块里打字时用） */
export function refreshCodeBlock(pre, { caret = false } = {}) {
  if (!isCodeBlock(pre)) return false
  const codeEl = codeElementOf(pre)
  // 外部 HTML（只有 class="language-x"）落地时补上编辑器自己的语言标记，
  // 否则后续切语言/展示语言角标取不到语言
  if (!pre.hasAttribute('data-k-lang')) applyLanguage(pre, languageOf(pre) || 'plaintext')
  const text = codeTextOf(codeEl)
  const html = highlightCode(text, languageOf(pre))
  if (codeEl.innerHTML === html) return false
  const offset = caret ? caretOffsetIn(codeEl) : null
  codeEl.innerHTML = html
  if (offset !== null) setCaretOffsetIn(codeEl, offset)
  return true
}

/** 高亮容器内所有代码块（内容被整体替换后调用） */
export function highlightCodeBlocks(root, { highlight = true } = {}) {
  if (!root) return 0
  let count = 0
  root.querySelectorAll('pre').forEach((pre) => {
    if (!isCodeBlock(pre)) return
    const codeEl = codeElementOf(pre)
    if (!pre.hasAttribute('data-k-lang')) pre.setAttribute('data-k-lang', languageOf(pre) || 'plaintext')
    const text = codeTextOf(codeEl)
    const html = highlight ? highlightCode(text, languageOf(pre)) : escapeHtml(text)
    if (codeEl.innerHTML !== html) codeEl.innerHTML = html
    count += 1
  })
  return count
}

/** 去掉高亮 span，仅保留纯文本（导出时用；token 是平铺的，直接替换即可） */
export function stripHighlight(root) {
  if (!root) return 0
  const tokens = root.querySelectorAll('span[class*="ke-tok-"]')
  tokens.forEach((span) => span.replaceWith(document.createTextNode(span.textContent)))
  if (tokens.length) root.normalize()
  return tokens.length
}

export const CODE_MAX_LENGTH = MAX_HIGHLIGHT_LENGTH
