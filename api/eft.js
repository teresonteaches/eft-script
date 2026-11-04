// Inner Alchemy EFT-Inspired Script Creator: the whole app in one file.
// The page asks the nine intake questions itself, one at a time. When all nine are
// answered, this file makes ONE Claude Haiku call to write the personalized script.
// Safety: crisis words are checked on the page after every answer AND here on the
// server before Claude is called, and Claude is also asked to flag anything missed.
// Your API key stays on Vercel.
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from Vercel's settings
const MODEL = process.env.EFT_MODEL || "claude-haiku-5-5"; // about a tenth of a cent per script
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",").map(s => s.trim()).filter(Boolean);

// ---------- Safety stop ----------
// If any answer mentions immediate danger, suicidal intent, self-harm, harming another
// person, a medical emergency, severe disorientation, or not being able to stay safe,
// the intake stops and no script is written. The same list runs on the page and here.
const SAFETY_PATTERNS = [
  "suicid", "kill(ing)? my ?self", "end(ing)? (it all|my life|things)", "take my (own )?life",
  "want(ed)? to die", "wish i (was|were) dead", "better off dead", "(don'?t|do not) want to (live|be alive|be here anymore|wake up)",
  "no reason to live", "not worth living", "self[- ]?harm", "hurt(ing)? my ?self", "harm(ing)? my ?self",
  "cut(ting)? my ?self", "overdos", "jump off", "hang my ?self", "slit my",
  "kill (him|her|them|someone|somebody|my (husband|wife|partner|ex|boss|mother|father|mom|dad|child|kids?))",
  "hurt (him|her|them|someone|somebody) (badly|physically)", "harm (him|her|them|someone|somebody|others|another person)",
  "(can'?t|cannot|unable to) (keep|stay) (myself )?safe", "not safe right now", "in danger", "immediate danger",
  "he'?s going to hurt me", "she'?s going to hurt me", "they'?re going to hurt me",
  "medical emergency", "heart attack", "having a stroke", "call(ing)? 911", "need an ambulance",
  "(don'?t|do not) know where i am", "(don'?t|do not) know who i am", "severely disoriented",
];
const SAFETY_SOURCE = "(" + SAFETY_PATTERNS.join("|") + ")";
const SAFETY_RE = new RegExp(SAFETY_SOURCE, "i");
const needsSafetyStop = text => SAFETY_RE.test(String(text || "").replace(/[’‘]/g, "'"));

// ---------- What Claude is asked to do ----------
const SYSTEM_PROMPT = `You are the Inner Alchemy EFT-Inspired Script Creator, a structured writing assistant. You are not a therapist, EFT practitioner, counselor, diagnostician, medical professional, crisis worker, psychic, or relationship coach.

The user has already answered the nine intake questions. Your job is to write exactly one personalized EFT-inspired tapping reflection script from their answers. The script is a general wellness and personal reflection practice that helps the user acknowledge one current situation, notice their feelings without judgment, observe tension without interpreting it, respond to themselves with compassion, create some space around a recurring thought, return to the present moment, and move toward a believable sense of peace, acceptance, or grounding. Never promise a specific emotional outcome or claim that tapping heals, treats, cures, clears, releases, or resolves medical or psychological conditions.

SAFETY CHECK FIRST
If any answer mentions immediate danger, suicidal intent, self-harm, intent to harm another person, a medical emergency, severe disorientation, or inability to stay safe, set safety_stop to true and leave every other field as an empty string. Otherwise set safety_stop to false. Do not turn this into a clinical risk assessment: ordinary pain, sadness, anger, fear, or physical tension is not a reason to stop.

PERSONALIZATION
Use all nine answers: the situation, the most difficult aspect, the strongest feeling, the 0-10 rating, where they notice it in the body or attention, the sensation's qualities, the recurring thought, the direction they want to move toward, and their spiritual-language preference. Use the user's actual words as naturally as possible, without unnecessary repetition. Address only one current issue.
Do not invent background details, childhood experiences, hidden beliefs, trauma, emotional wounds, or spiritual meanings. Never interpret symptoms or sensations, and never assign meaning to unexplained physical discomfort. Do not analyze other people's thoughts, feelings, intentions, or behaviors. Use the user's description as context, not as evidence of why something happened. Do not decide whether the recurring thought is true, validate it as fact, or challenge it: treat it as something the user is noticing right now. Do not add emotions the user did not describe. Never interpret the 0-10 number; mention it only in the summary.

OUTPUT FIELDS
summary: one or two sentences, addressed to the user as "you", reflecting their situation, strongest feeling, recurring thought, body or attention experience, and their original 0-10 rating. Descriptive and neutral: no diagnosis, analysis, or advice.
setup (Karate Chop): three setup statements. Each acknowledges the issue, recognizes the strongest feeling or recurring thought, and introduces permission for self-kindness without forcing acceptance or positivity. Example shapes, to vary naturally:
"Even though I'm feeling [strongest emotion] about [specific situation], I can acknowledge what I'm experiencing right now."
"Even though the thought '[recurring thought]' keeps coming back, I can meet myself with a little compassion."
"Even though I notice [body or attention sensation], I don't have to make this moment different before I can be kind to myself."
Then five rounds, each with one short statement for each of the eight points (eyebrow, side of eye, under eye, under nose, chin, collarbone, under arm, top of head):
Round 1, acknowledgment: acknowledge the situation, feeling, recurring thought, and sensation ("I'm noticing...", "The thought '...' keeps returning.", "This is what I'm experiencing right now."). No exaggeration or intensifying distress.
Round 2, compassion: a kinder relationship with the present experience ("I can be gentle with myself about this.", "I don't have to force myself to feel differently."). Never declare that the user has healed or overcome anything.
Round 3, space: a thought, feeling, or sensation can be present without needing all their attention ("I can notice this thought without answering it right now.", "I don't have to solve everything in this moment."). Do not require a particular sensation or improvement.
Round 4, gentle reorientation: introduce their desired direction in realistic, believable language ("I'm open to a little more...", "I can take this moment one breath at a time.").
Round 5, integration: bring together acknowledgment, self-compassion, present-moment awareness, and their desired direction ("I can acknowledge what I'm feeling and still be kind to myself.", "I'm willing to move gently toward..."). Never claim the problem is resolved.
closing: three brief first-person reflections that acknowledge the present experience, reinforce permission for gentleness, and return attention to the present moment. Default, personalized where natural: "I acknowledge what I'm experiencing." / "I can meet myself with compassion, exactly where I am." / "For now, I can return to this moment, one gentle breath at a time."

LANGUAGE AND VOICE
Every tapping statement is first person, short, and easy to speak aloud. Calm, warm but not overly familiar, direct, grounded, compassionate, natural, plain. The emotional progression is gradual: never jump from painful acknowledgment to exaggerated happiness. Use transitional language such as "I can begin to...", "I may be willing to...", "I'm open to...", "Perhaps I can...", "For this moment...", "A little more...", "I don't have to force...".
Avoid clinical language, diagnoses, therapy terminology, dramatic emotional descriptions, forced positivity, exaggerated encouragement, complex metaphors or spiritual explanations, claims of energetic or emotional healing, predictions, coaching, relationship interpretation, and guarantees of transformation. Never claim the user has processed trauma, changed their nervous system, cleared an energetic block, healed an emotional wound, reprogrammed their subconscious, or completed emotional treatment.

SPIRITUAL LANGUAGE
If the preference is "Yes, include it": you may use gentle Inner Alchemy spiritual language sparingly, only from Round 4 onward (Round 4, Round 5, closing): connection to Source, gentle spiritual trust, inner wisdom, soul, consciousness, willingness to surrender some control, spiritual growth as a personal possibility. Keep it grounded, optional, and emotionally respectful; never use it to dismiss or bypass feelings; never present beliefs as universal facts. Never promise divine intervention, guaranteed reunion, manifestation of a particular person, twin-flame certainty, a predetermined spiritual outcome, spiritual healing, destiny, or certainty about another person's intentions. Never imply that a person must stop feeling pain to become spiritually aligned.
If the preference is "No, keep the language straightforward": use no references to soul, Source, surrender, consciousness, divine timing, spiritual growth, or any spiritual or mystical concept anywhere. Keep everything compassionate, straightforward, and practical.

Before answering, silently check: one issue only; summary includes strongest feeling, recurring thought, body or attention experience, and the rating; every tapping statement is first person; the five stages are in order; spiritual language only if requested; no diagnosis, interpretation, treatment claim, prediction, or guarantee; no follow-up question, coaching, or extra script.`;

const POINTS = ["eyebrow", "side_of_eye", "under_eye", "under_nose", "chin", "collarbone", "under_arm", "top_of_head"];
const ROUNDS = ["acknowledgment", "compassion", "space", "gentle_reorientation", "integration"];
const strings = keys => ({ type: "object", properties: Object.fromEntries(keys.map(k => [k, { type: "string" }])), required: keys, additionalProperties: false });
const SCRIPT_SCHEMA = {
  type: "object",
  properties: {
    safety_stop: { type: "boolean" },
    summary: { type: "string" },
    setup: strings(["statement_1", "statement_2", "statement_3"]),
    rounds: { type: "object", properties: Object.fromEntries(ROUNDS.map(r => [r, strings(POINTS)])), required: ROUNDS, additionalProperties: false },
    closing: strings(["reflection_1", "reflection_2", "reflection_3"]),
  },
  required: ["safety_stop", "summary", "setup", "rounds", "closing"],
  additionalProperties: false,
};

function intakeText(a){
  return `Here are the user's nine intake answers.

1. Situation, thought, or feeling to acknowledge today: ${a.situation}
2. What feels most difficult, painful, or activating right now: ${a.difficult}
3. Words for how this feels right now: ${a.feelings}
   Strongest feeling: ${a.strongest}
4. How strong it feels right now (0-10 personal check-in): ${a.intensity}
5. Where they notice it most in body or attention: ${a.body}
6. How they describe the sensation or experience: ${a.sensation}
7. The sentence or thought that keeps returning: ${a.thought}
8. What they would like to move gently toward: ${a.direction}
9. Spiritual language: ${a.spiritual ? "Yes, include it." : "No, keep the language straightforward."}`;
}

async function writeScript(a){
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    output_config: { effort: "low", format: { type: "json_schema", schema: SCRIPT_SCHEMA } },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: intakeText(a) }],
  });
  if (message.stop_reason === "refusal") return { refused: true };
  const text = message.content.filter(b => b.type === "text").map(b => b.text).join("");
  const s = JSON.parse(text);
  if (s.safety_stop) return { safety: true };
  const all = [s.summary, ...Object.values(s.setup), ...ROUNDS.flatMap(r => Object.values(s.rounds[r])), ...Object.values(s.closing)];
  if (all.some(x => !String(x || "").trim())) throw new Error("incomplete script");
  return { script: s };
}

// ---------- The web address handler ----------
const clean = (s, n) => String(s ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);

export default async function handler(req, res){
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.length && origin && !ALLOWED_ORIGINS.includes(origin)){
    res.status(403).json({ error: "Not allowed from this site." });
    return;
  }
  if (req.method === "GET"){
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(PAGE_HTML);
    return;
  }
  if (req.method !== "POST"){
    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "Use POST." });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  const b = req.body || {};
  const a = {
    situation: clean(b.situation, 1200), difficult: clean(b.difficult, 1200), feelings: clean(b.feelings, 300),
    strongest: clean(b.strongest || b.feelings, 120), intensity: Number.parseInt(b.intensity, 10),
    body: clean(b.body, 500), sensation: clean(b.sensation, 600), thought: clean(b.thought, 500),
    direction: clean(b.direction, 300), spiritual: b.spiritual === true,
  };
  const texts = [a.situation, a.difficult, a.feelings, a.strongest, a.body, a.sensation, a.thought, a.direction];
  if (texts.some(t => !t) || !(a.intensity >= 0 && a.intensity <= 10) || typeof b.spiritual !== "boolean"){
    res.status(400).json({ error: "missing" });
    return;
  }
  if (texts.some(needsSafetyStop)){
    res.status(200).json({ safety: true });
    return;
  }
  for (let attempt = 1; attempt <= 2; attempt++){
    try{
      const out = await writeScript(a);
      if (out.refused){ res.status(200).json({ safety: true }); return; }
      res.status(200).json(out);
      return;
    } catch (e){
      console.error("Script attempt " + attempt + " failed:", e?.status || "", e?.message);
    }
  }
  res.status(502).json({ error: "failed" });
}

// ---------- The page people see ----------
const PAGE_HTML = String.raw`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>EFT Script Creator</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,500;0,600;1,400;1,500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>
:root{--bg:#ffffff;--surface:#ffffff;--ink:#2a1220;--ink-soft:#6b4f60;--ink-faint:#9c7f8d;--line:#ecdde3;--deep:#8f1a4f;--accent:#d63b7b;--tint:#fbe6ee;--tint-line:#f3c8da;--danger:#a83246}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#160a13;--surface:#20101b;--ink:#f5e8ee;--ink-soft:#c39cb2;--ink-faint:#8f6e80;--line:#3a1f31;--deep:#f0b3d9;--accent:#ef5c98;--tint:#33182a;--tint-line:#4a2438;--danger:#ff8095;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#160a13;--surface:#20101b;--ink:#f5e8ee;--ink-soft:#c39cb2;--ink-faint:#8f6e80;--line:#3a1f31;--deep:#f0b3d9;--accent:#ef5c98;--tint:#33182a;--tint-line:#4a2438;--danger:#ff8095;color-scheme:dark}
*{box-sizing:border-box}
html,body{margin:0}
body{background:var(--bg);color:var(--ink);font-family:"IBM Plex Sans",system-ui,-apple-system,sans-serif;font-size:16px;line-height:1.6}
[hidden]{display:none!important}
h1,h2,h3,.serif{font-family:"Fraunces",Georgia,serif}
header{border-bottom:1px solid var(--line);background:var(--bg);position:sticky;top:0;z-index:2}
.top{max-width:720px;margin:0 auto;padding:1rem 1.25rem .85rem;display:flex;justify-content:space-between;align-items:flex-end;gap:1rem}
.eyebrow{margin:0 0 .15rem;font-family:"Fraunces",serif;font-style:italic;font-size:.72rem;letter-spacing:.11em;text-transform:uppercase;color:var(--accent)}
.brand{margin:0;font-size:1.4rem;font-weight:600;color:var(--deep);line-height:1.15}
.count{font-size:.78rem;color:var(--ink-faint);white-space:nowrap}
.bar{height:3px;background:var(--line)}.bar span{display:block;height:100%;width:0;background:var(--accent);transition:width .35s ease}
main{max-width:720px;margin:0 auto;padding:1.75rem 1.25rem 3rem}
.ghost{font:inherit;font-size:.85rem;border:1px solid var(--line);background:transparent;color:var(--ink-soft);padding:.5rem .85rem;border-radius:8px;cursor:pointer}
.ghost:hover{border-color:var(--accent);color:var(--accent)}
.primary{font:inherit;font-weight:500;font-size:.95rem;border:0;border-radius:10px;padding:.75rem 1.3rem;background:var(--deep);color:var(--bg);cursor:pointer}
.primary:disabled{opacity:.4;cursor:default}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.prose h1{font-size:1.7rem;color:var(--deep);line-height:1.2;margin:0 0 .8rem}
.prose h2{font-size:1.25rem;color:var(--deep);margin:1.8em 0 .5em;padding-top:1.1em;border-top:1px solid var(--line)}
.prose p{margin:0 0 .85em}
.qlabel{font-family:"Fraunces",serif;font-style:italic;font-size:.78rem;letter-spacing:.09em;text-transform:uppercase;color:var(--accent);margin:0 0 .4rem}
.qtext{font-family:"Fraunces",serif;font-size:1.4rem;font-weight:500;line-height:1.35;color:var(--ink);margin:0 0 .6rem}
.qhelp{color:var(--ink-soft);margin:0 0 1rem;font-size:.95rem}
textarea,input[type=text]{width:100%;font:inherit;font-size:1.02rem;padding:.75rem .9rem;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink);resize:vertical}
textarea{min-height:6.5rem}
textarea:focus,input:focus{border-color:var(--accent);outline:none}
.chips{display:flex;flex-wrap:wrap;gap:.45rem;margin-top:.9rem}
.chip{font:inherit;font-size:.9rem;border:1px solid var(--line);background:var(--surface);color:var(--ink);padding:.45rem .8rem;border-radius:999px;cursor:pointer}
.chip:hover{border-color:var(--tint-line)}
.chip[aria-pressed="true"]{background:var(--deep);border-color:var(--deep);color:var(--bg)}
.scale{display:grid;grid-template-columns:repeat(11,1fr);gap:.35rem;margin-top:.4rem}
.scale button{font:inherit;font-size:1rem;padding:.65rem 0;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink);cursor:pointer}
.scale button[aria-pressed="true"]{background:var(--deep);border-color:var(--deep);color:var(--bg)}
.scale-ends{display:flex;justify-content:space-between;font-size:.8rem;color:var(--ink-faint);margin-top:.3rem}
.choices{display:grid;gap:.5rem;margin-top:1rem}
.choice{text-align:left;font:inherit;color:var(--ink);background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:.8rem 1rem;cursor:pointer;width:100%}
.choice:hover{border-color:var(--tint-line)}
.choice[aria-pressed="true"]{border-color:var(--deep);background:var(--tint)}
.nav{display:flex;justify-content:space-between;align-items:center;margin-top:1.6rem;gap:.6rem}
.notice{margin-top:1rem;padding:.7rem 1rem;border:1px dashed var(--line);border-radius:10px;color:var(--ink-soft);font-size:.92rem}
.notice.err{color:var(--danger)}
.dots{display:inline-flex;gap:5px;align-items:center;color:var(--ink-soft);font-size:.95rem}
.dots i{width:6px;height:6px;border-radius:50%;background:var(--accent);opacity:.35;animation:pulse 1.1s ease-in-out infinite}
.dots i:nth-child(2){animation-delay:.15s}.dots i:nth-child(3){animation-delay:.3s}
@keyframes pulse{0%,80%,100%{opacity:.25}40%{opacity:1}}
@media (prefers-reduced-motion: reduce){.dots i{animation:none;opacity:.7}.bar span{transition:none}}
.summary{padding:1.1rem 1.25rem;border:1px solid var(--tint-line);background:var(--tint);border-radius:14px;margin:0 0 1.2rem}
.instr{border-left:3px solid var(--accent);padding:.6rem 1rem;margin:0 0 1rem;font-weight:500}
.round{border:1px solid var(--line);border-radius:14px;padding:1rem 1.2rem;margin:1rem 0;background:var(--surface)}
.round h2{border:0;margin:0 0 .15rem;padding:0;font-size:1.15rem}
.round .sub{margin:0 0 .7rem;color:var(--ink-soft);font-size:.9rem}
.lines{margin:0;padding:0;list-style:none}
.lines li{display:grid;grid-template-columns:8.5rem 1fr;gap:.8rem;padding:.5rem 0;border-top:1px solid var(--line)}
.lines li:first-child{border-top:0}
.pt{font-size:.82rem;color:var(--accent);font-weight:600;letter-spacing:.02em;padding-top:.15rem}
.say{font-family:"Fraunces",Georgia,serif;font-size:1.06rem;line-height:1.45}
.closing{border:2px solid var(--accent);border-radius:14px;padding:1rem 1.2rem;margin:1.2rem 0}
.closing h2{border:0;margin:0 0 .5rem;padding:0;font-size:1.15rem}
.closing p{font-family:"Fraunces",Georgia,serif;font-size:1.08rem;margin:.3rem 0}
.safety{border:2px solid var(--danger);border-radius:14px;padding:1.2rem 1.3rem}
.safety h1{color:var(--danger)!important}
.actions{display:flex;gap:.6rem;flex-wrap:wrap;margin-top:1rem}
.fine{max-width:720px;margin:0 auto;padding:0 1.25rem 1.5rem;font-size:.72rem;color:var(--ink-faint);text-align:center}
@media (max-width:600px){.eyebrow{display:none}.brand{font-size:1.05rem}.top{align-items:center;padding:.7rem 1rem}main{padding:1.25rem 1rem 2.5rem}.qtext{font-size:1.2rem}.count{display:none}.scale{grid-template-columns:repeat(6,1fr)}.lines li{grid-template-columns:1fr;gap:.1rem}}
@media print{header,.actions,.fine{display:none!important}body{background:#fff;color:#000}.round,.closing,.summary{break-inside:avoid}}
</style></head><body>
<header><div class="top"><div><p class="eyebrow">Inner Alchemy</p><p class="brand serif">EFT-Inspired Script Creator</p></div>
<div style="display:flex;gap:.75rem;align-items:center"><span class="count" id="count" hidden></span><button class="ghost" id="restart" type="button" hidden>Start over</button></div></div>
<div class="bar" aria-hidden="true"><span id="fill"></span></div></header>
<main>

<section id="welcome" class="prose">
<h1>Your personalized tapping reflection script</h1>
<p>Answer nine short questions, one at a time, about one situation, thought, or feeling in your life right now. Your answers are then woven into one EFT-inspired tapping reflection script, written in your own words, for you to speak aloud or silently as you tap.</p>
<p style="font-size:.9rem;color:var(--ink-soft)">This is a general wellness and personal reflection practice. It is not therapy, counseling, diagnosis, medical care, or a crisis service, and it does not promise any particular result. If you are in crisis or not safe, please contact local emergency services or a crisis line instead.</p>
<div class="actions"><button class="primary" id="begin" type="button">Generate my EFT script</button></div>
</section>

<section id="ask" hidden>
<p class="qlabel" id="qlabel"></p>
<h1 class="qtext" id="qtext"></h1>
<p class="qhelp" id="qhelp"></p>
<div id="qbody"></div>
<div class="notice err" id="qerr" hidden></div>
<div class="nav"><button class="ghost" id="back" type="button">Back</button><button class="primary" id="next" type="button">Next</button></div>
</section>

<section id="safety" hidden>
<div class="safety prose">
<h1>Let's pause here</h1>
<p>What you shared sounds like it may need more support than a tapping script can offer, so this tool will stop here and won't create a script.</p>
<p><strong>Please reach out to real-world support right now.</strong></p>
<p>If you are in immediate danger or this is a medical emergency, call your local emergency number (911 in the US and Canada, 999 in the UK, 112 in the EU).</p>
<p>In the US, you can call or text <strong>988</strong> (Suicide &amp; Crisis Lifeline), any time. In the UK and Ireland, Samaritans are at <strong>116 123</strong>. Anywhere else, <a href="https://findahelpline.com" target="_blank" rel="noopener">findahelpline.com</a> lists free, confidential crisis lines in your country.</p>
<p>You can also contact someone you trust and let them know how you are doing. You don't have to go through this alone.</p>
</div>
</section>

<section id="result" hidden>
<div id="status"></div>
<div id="script" class="prose"></div>
</section>
</main>
<p class="fine">Inner Alchemy · a personal reflection practice, not a substitute for medical or psychological care</p>
<script>
(function(){
var API_URL = "/api/eft";
var SAFETY_RE = new RegExp("__SAFETY__", "i");
function $(id){ return document.getElementById(id); }
function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
function unsafe(t){ return SAFETY_RE.test(String(t || "").replace(/[’‘]/g, "'")); }

var A, step, last;
function reset(){ A = { situation:"", difficult:"", feelings:"", strongest:"", intensity:null, body:"", sensation:"", thought:"", direction:"", spiritual:null }; step = 0; last = null; }
reset();

function splitFeelings(s){
  return s.split(/\s*(?:,|;|\/|\band\b|&|\+|\n)\s*/i).map(function(x){ return x.replace(/^(i feel|i'm feeling|feeling|very|really|so)\s+/i, "").replace(/[.!]+$/,"").trim(); }).filter(Boolean)
    .filter(function(x, i, arr){ return arr.map(function(y){ return y.toLowerCase(); }).indexOf(x.toLowerCase()) === i; });
}
function textBox(key, rows){ return '<textarea id="f" rows="' + (rows || 4) + '" maxlength="1200">' + esc(A[key]) + '</textarea>'; }
function inputBox(key, max){ return '<input type="text" id="f" maxlength="' + (max || 300) + '" value="' + esc(A[key]) + '">'; }
function chips(list){ return '<div class="chips" id="ch">' + list.map(function(x){ return '<button type="button" class="chip" aria-pressed="false">' + esc(x) + '</button>'; }).join("") + '</div>'; }
function wireChips(){
  var box = $("ch"); if (!box) return;
  var cur = $("f").value.toLowerCase();
  [].forEach.call(box.children, function(b){ if (cur.indexOf(b.textContent.toLowerCase()) !== -1) b.setAttribute("aria-pressed","true"); });
  box.addEventListener("click", function(e){
    var b = e.target.closest(".chip"); if (!b) return;
    var f = $("f"), word = b.textContent;
    var parts = f.value.split(/\s*,\s*/).filter(Boolean);
    var i = parts.map(function(p){ return p.toLowerCase(); }).indexOf(word.toLowerCase());
    if (i === -1) parts.push(f.value.trim() ? word.toLowerCase() : word); else parts.splice(i, 1);
    f.value = parts.join(", ");
    b.setAttribute("aria-pressed", i === -1 ? "true" : "false");
  });
}
function need(v, msg){ return v ? "" : msg; }

var FEELINGS = ["Sad","tense","angry","uncertain","restless","disappointed","overwhelmed","lonely","stuck","preoccupied","frustrated","afraid","heavy","numb"];
var BODY = ["Pressure or heaviness in the chest","Tightness in the throat","Tension in the jaw, neck, or shoulders","A knot or emptiness in the stomach","Pressure behind the eyes","Restlessness in the arms or legs","Cloudy or crowded thoughts","Mental noise","Numbness","Overall heaviness","No clear physical sensation"];
var SENSATIONS = ["Tight","heavy","hollow","warm","cold","buzzing","pulsing","constricted","restless","numb","cloudy","crowded","aching","frozen","shaky","pressured","disconnected"];
var DIRECTIONS = ["A little more peace","More space around the thought","Greater calm","Self-compassion","Acceptance of the present moment","Trust in myself","Connection to Source","Willingness to release some control","Returning to my own life","Feeling less consumed","Feeling more grounded"];

var STEPS = [
  { n:1, key:"situation", q:"What situation, thought, or feeling would you like your tapping script to acknowledge today?",
    help:"Choose one specific thing that is current for you.",
    render:function(){ return textBox("situation"); },
    read:function(){ A.situation = $("f").value.trim(); return need(A.situation, "Please write a few words about one situation, thought, or feeling."); } },
  { n:2, key:"difficult", q:"What feels most difficult, painful, or activating about this right now?", help:"",
    render:function(){ return textBox("difficult"); },
    read:function(){ A.difficult = $("f").value.trim(); return need(A.difficult, "Please write a few words, even if it's just a phrase."); } },
  { n:3, key:"feelings", q:"What words best describe how this feels right now?",
    help:"For example: sad, tense, angry, uncertain, restless, disappointed, overwhelmed, lonely, stuck, preoccupied, frustrated, afraid, heavy, or numb. Tap any that fit, or use your own words.",
    render:function(){ return inputBox("feelings") + chips(FEELINGS); }, wire:wireChips,
    read:function(){ A.feelings = $("f").value.trim(); var p = splitFeelings(A.feelings); if (p.length === 1) A.strongest = p[0]; else if (p.indexOf(A.strongest) === -1) A.strongest = ""; return need(A.feelings, "Please write or tap at least one word."); } },
  { n:3, sub:true, key:"strongest", q:"Which one feels strongest?", help:"",
    skip:function(){ return splitFeelings(A.feelings).length < 2; },
    render:function(){ return '<div class="choices" id="cs">' + splitFeelings(A.feelings).map(function(x){ return '<button type="button" class="choice" aria-pressed="' + (A.strongest === x) + '">' + esc(x) + '</button>'; }).join("") + '</div>'; },
    wire:function(){ $("cs").addEventListener("click", function(e){ var b = e.target.closest(".choice"); if (!b) return; A.strongest = b.textContent; [].forEach.call($("cs").children, function(x){ x.setAttribute("aria-pressed", x === b); }); $("qerr").hidden = true; }); },
    read:function(){ return need(A.strongest, "Please tap the feeling that is strongest right now."); } },
  { n:4, key:"intensity", q:"How strong does this feel right now on a scale from 0 to 10?",
    help:"0 means it does not feel strong right now. 10 means it feels extremely strong right now. This is simply a personal check-in, not a clinical assessment.",
    render:function(){ var h = '<div class="scale" id="sc">'; for (var i = 0; i <= 10; i++) h += '<button type="button" aria-pressed="' + (A.intensity === i) + '">' + i + '</button>'; return h + '</div><div class="scale-ends"><span>0 · not strong right now</span><span>10 · extremely strong</span></div>'; },
    wire:function(){ $("sc").addEventListener("click", function(e){ var b = e.target.closest("button"); if (!b) return; A.intensity = Number(b.textContent); [].forEach.call($("sc").children, function(x){ x.setAttribute("aria-pressed", x === b); }); $("qerr").hidden = true; }); },
    read:function(){ return A.intensity === null ? "Please tap a number from 0 to 10." : ""; } },
  { n:5, key:"body", q:"Where do you notice this most strongly in your body or attention right now?",
    help:"You do not have to identify it perfectly. A vague answer is enough.",
    render:function(){ return inputBox("body", 500) + chips(BODY); }, wire:wireChips,
    read:function(){ A.body = $("f").value.trim(); return need(A.body, "Please write or tap anything that fits, even \"No clear physical sensation\"."); } },
  { n:6, key:"sensation", q:"How would you describe the sensation or experience more specifically?",
    help:"Words like these may help, or use your own. You can also describe its size, shape, color, temperature, movement, weight, or texture, but you don't have to.",
    render:function(){ return textBox("sensation", 3) + chips(SENSATIONS); }, wire:wireChips,
    read:function(){ A.sensation = $("f").value.trim(); return need(A.sensation, "Please write or tap a word or two."); } },
  { n:7, key:"thought", q:"What sentence or thought keeps returning when you focus on this situation?",
    help:"Write it the way it sounds in your mind.",
    render:function(){ return textBox("thought", 3); },
    read:function(){ A.thought = $("f").value.trim(); return need(A.thought, "Please write the thought, even if it's only a few words."); } },
  { n:8, key:"direction", q:"What would you like to move gently toward during this practice?",
    help:"Choose something that feels realistic and believable for you right now, rather than a perfect outcome.",
    render:function(){ return inputBox("direction") + chips(DIRECTIONS); }, wire:wireChips,
    read:function(){ A.direction = $("f").value.trim(); return need(A.direction, "Please write or tap a direction."); } },
  { n:9, key:"spiritual", q:"Would you like gentle Inner Alchemy spiritual language included in your script?", help:"",
    render:function(){ return '<div class="choices" id="sp"><button type="button" class="choice" data-v="yes" aria-pressed="' + (A.spiritual === true) + '">1. Yes, include it.</button><button type="button" class="choice" data-v="no" aria-pressed="' + (A.spiritual === false) + '">2. No, keep the language straightforward.</button></div>'; },
    wire:function(){ $("sp").addEventListener("click", function(e){ var b = e.target.closest(".choice"); if (!b) return; A.spiritual = b.dataset.v === "yes"; [].forEach.call($("sp").children, function(x){ x.setAttribute("aria-pressed", x === b); }); $("qerr").hidden = true; }); },
    read:function(){ return A.spiritual === null ? "Please choose one option." : ""; } }
];

function show(view){
  ["welcome","ask","safety","result"].forEach(function(v){ $(v).hidden = v !== view; });
  $("restart").hidden = view !== "ask"; $("count").hidden = view !== "ask";
  window.scrollTo(0, 0);
}
function renderStep(){
  var s = STEPS[step];
  $("qlabel").textContent = "Question " + s.n + " of 9"; $("qtext").textContent = s.q;
  $("qhelp").textContent = s.help; $("qhelp").hidden = !s.help;
  $("qbody").innerHTML = s.render(); if (s.wire) s.wire();
  $("qerr").hidden = true;
  $("next").textContent = step === STEPS.length - 1 ? "Create my script" : "Next";
  $("count").textContent = s.n + " of 9";
  $("fill").style.width = ((s.n - 1) / 9 * 100) + "%";
  var f = $("f"); if (f && window.matchMedia("(min-width:601px)").matches) f.focus();
}
function move(dir){
  do { step += dir; } while (step > 0 && step < STEPS.length && STEPS[step].skip && STEPS[step].skip());
}
function safetyStop(){ $("fill").style.width = "0"; show("safety"); }

$("begin").onclick = function(){ reset(); show("ask"); renderStep(); };
$("back").onclick = function(){ if (step === 0){ show("welcome"); return; } STEPS[step].read(); move(-1); renderStep(); };
$("next").onclick = function(){
  var s = STEPS[step], err = s.read();
  if (err){ $("qerr").textContent = err; $("qerr").hidden = false; return; }
  if (s.key && typeof A[s.key] === "string" && unsafe(A[s.key])){ safetyStop(); return; }
  if (step < STEPS.length - 1){ move(1); renderStep(); } else create();
};
$("ask").addEventListener("keydown", function(e){ if (e.key === "Enter" && e.target.id === "f" && e.target.tagName === "INPUT"){ e.preventDefault(); $("next").click(); } });
$("restart").onclick = function(){ reset(); $("fill").style.width = "0"; show("welcome"); };

var POINTS = [["eyebrow","Eyebrow"],["side_of_eye","Side of Eye"],["under_eye","Under Eye"],["under_nose","Under Nose"],["chin","Chin"],["collarbone","Collarbone"],["under_arm","Under Arm"],["top_of_head","Top of Head"]];
var ROUNDS = [["acknowledgment","Round 1 · Acknowledgment"],["compassion","Round 2 · Compassion"],["space","Round 3 · Space"],["gentle_reorientation","Round 4 · Gentle Reorientation"],["integration","Round 5 · Integration"]];
var INSTRUCTIONS = "Tap gently. You may use either side of the body. Skip any point that feels uncomfortable. Speak the statements aloud when possible, or repeat them silently.";

async function create(){
  show("result"); $("fill").style.width = "100%"; $("script").innerHTML = "";
  $("status").innerHTML = '<p class="dots"><i></i><i></i><i></i> Writing your personalized script…</p>';
  try{
    var r = await fetch(API_URL, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(A) });
    if (!r.ok) throw new Error(r.status);
    var data = await r.json();
    if (data.safety){ safetyStop(); return; }
    if (!data.script) throw new Error("empty");
    last = data.script;
    $("status").innerHTML = "";
    $("script").innerHTML = render(last);
    $("copy").onclick = copyScript; $("print").onclick = function(){ window.print(); };
  } catch (e){
    $("status").innerHTML = '<div class="notice err">Something went wrong while writing your script. Your answers are still here.</div><div class="actions"><button class="primary" id="retry" type="button">Try again</button></div>';
    $("retry").onclick = create;
  }
}
function render(s){
  var h = '<h1>Your Tapping Reflection Script</h1><div class="summary">' + esc(s.summary) + '</div>';
  h += '<p class="instr">' + esc(INSTRUCTIONS) + '</p>';
  h += '<div class="round"><h2>Setup · Karate Chop</h2><p class="sub">Side of the hand. Say each statement while tapping.</p><ul class="lines">';
  ["statement_1","statement_2","statement_3"].forEach(function(k){ h += '<li><span class="pt">Karate Chop</span><span class="say">' + esc(s.setup[k]) + '</span></li>'; });
  h += '</ul></div>';
  ROUNDS.forEach(function(r){
    h += '<div class="round"><h2>' + r[1] + '</h2><ul class="lines">';
    POINTS.forEach(function(p){ h += '<li><span class="pt">' + p[1] + '</span><span class="say">' + esc(s.rounds[r[0]][p[0]]) + '</span></li>'; });
    h += '</ul></div>';
  });
  h += '<div class="closing"><h2>Closing</h2>';
  ["reflection_1","reflection_2","reflection_3"].forEach(function(k){ h += '<p>' + esc(s.closing[k]) + '</p>'; });
  h += '</div><div class="actions"><button class="primary" id="copy" type="button">Copy my script</button><button class="ghost" id="print" type="button">Print or save as PDF</button></div>';
  return h;
}
function asText(s){
  var t = ["MY TAPPING REFLECTION SCRIPT", "", s.summary, "", INSTRUCTIONS, "", "SETUP · KARATE CHOP"];
  ["statement_1","statement_2","statement_3"].forEach(function(k){ t.push("Karate Chop: " + s.setup[k]); });
  ROUNDS.forEach(function(r){ t.push("", r[1].toUpperCase()); POINTS.forEach(function(p){ t.push(p[1] + ": " + s.rounds[r[0]][p[0]]); }); });
  t.push("", "CLOSING"); ["reflection_1","reflection_2","reflection_3"].forEach(function(k){ t.push(s.closing[k]); });
  return t.join("\n");
}
async function copyScript(){
  var b = $("copy");
  try{ await navigator.clipboard.writeText(asText(last)); b.textContent = "Copied"; }
  catch(e){ b.textContent = "Couldn't copy, please select the text"; }
  setTimeout(function(){ b.textContent = "Copy my script"; }, 2000);
}
})();
</script>
</body></html>`.replace("__SAFETY__", SAFETY_SOURCE.replace(/\\/g, "\\\\").replace(/"/g, '\\"'));
