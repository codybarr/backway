/** @jsxImportSource hono/jsx */
import type { FC } from 'hono/jsx';

const shell = `
:root{
  --bg:#f5efe3;
  --ink:#1f1a17;
  --muted:#6c625c;
  --card:#fffaf1;
  --line:rgba(31,26,23,.14);
  --accent:#bc4f2f;
  --accent-2:#21433c;
  --shadow:0 18px 60px rgba(67,48,35,.12);
}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:radial-gradient(circle at top left,#fff7ea 0,#f5efe3 48%,#efe6d4 100%);color:var(--ink)}
body{font-family:Georgia, Cambria, 'Times New Roman', serif;min-height:100vh}
a{color:inherit}
.page{max-width:1100px;margin:0 auto;padding:32px 20px 60px}
.hero{display:grid;grid-template-columns:1.2fr .8fr;gap:24px;align-items:stretch}
.panel{background:rgba(255,250,241,.82);backdrop-filter:blur(10px);border:1px solid var(--line);box-shadow:var(--shadow);border-radius:28px}
.mast{padding:34px;position:relative;overflow:hidden}
.kicker{font:700 11px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.18em;text-transform:uppercase;color:var(--accent)}
h1{font-size:clamp(3rem,8vw,6.4rem);line-height:.92;margin:12px 0 18px;font-weight:700;letter-spacing:-.05em}
.lead{max-width:60ch;color:var(--muted);font-size:18px;line-height:1.6}
.blob{position:absolute;right:-80px;top:-80px;width:220px;height:220px;border-radius:40% 60% 54% 46%;background:linear-gradient(135deg,rgba(188,79,47,.18),rgba(33,67,60,.06));transform:rotate(18deg)}
.form{margin-top:24px;display:flex;gap:12px;flex-wrap:wrap}
.input{flex:1;min-width:260px;padding:16px 18px;border-radius:18px;border:1px solid var(--line);background:#fffcf7;font-size:16px;color:var(--ink);outline:none}
.button{appearance:none;border:none;border-radius:18px;padding:16px 22px;background:linear-gradient(135deg,var(--accent),#d86f4d);color:#fff;font-weight:700;font-size:15px;cursor:pointer;box-shadow:0 10px 25px rgba(188,79,47,.22)}
.button.alt{background:linear-gradient(135deg,var(--accent-2),#37685d)}
.stats{padding:24px;display:grid;gap:16px}
.stat{padding:16px 0;border-bottom:1px solid var(--line)}
.stat:last-child{border-bottom:none}
.stat-label{font:700 11px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
.stat-value{margin-top:6px;font-size:30px;font-weight:700}
.grid{margin-top:24px;display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.card{padding:22px}
.card h3{margin:0 0 8px;font-size:22px}
.card p{margin:0;color:var(--muted);line-height:1.65}
.status{margin-top:24px;padding:20px 22px;display:none}
.status.visible{display:block}
.status strong{display:block;margin-bottom:6px}
.code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;word-break:break-all}
.footer{margin-top:20px;color:var(--muted);font-size:14px}
@media (max-width:900px){.hero,.grid{grid-template-columns:1fr}}
`;

export const LandingPage: FC = () => (
  <html>
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Backway</title>
      <style>{shell}</style>
    </head>
    <body>
      <main class="page">
        <section class="hero">
          <article class="panel mast">
            <div class="blob" />
            <div class="kicker">Cloudflare snapshot service</div>
            <h1>Capture the web before it slips.</h1>
            <p class="lead">
              Minimal Wayback-style snapshots on Workers, R2, D1, and Drizzle. Fetch-first HTML capture,
              best-effort assets, and screenshot fallback for JS-heavy pages.
            </p>
            <form id="snapshot-form" class="form">
              <input class="input" type="url" name="url" placeholder="https://example.com/article" required />
              <button class="button" type="submit">Capture snapshot</button>
            </form>
            <div id="status" class="panel status">
              <strong>Waiting for capture…</strong>
              <div class="code" id="status-body"></div>
            </div>
            <div class="footer">Immutable snapshots • static replay • graceful degradation</div>
          </article>
          <aside class="panel stats">
            <div class="stat">
              <div class="stat-label">Capture flow</div>
              <div class="stat-value">fetch → store → replay</div>
            </div>
            <div class="stat">
              <div class="stat-label">Storage layout</div>
              <div class="code">/snapshots/&lt;id&gt;/index.html<br/>/snapshots/&lt;id&gt;/metadata.json<br/>/snapshots/&lt;id&gt;/screenshot.png<br/>/assets/&lt;hash&gt;</div>
            </div>
            <div class="stat">
              <div class="stat-label">Safety rails</div>
              <div class="code">asset size caps, total size caps, rate limiting, auth-page skip</div>
            </div>
          </aside>
        </section>

        <section class="grid">
          <article class="panel card">
            <h3>Static replay</h3>
            <p>HTML is rewritten to point at stored assets, then served back from R2 with no live dependency on the origin.</p>
          </article>
          <article class="panel card">
            <h3>Best-effort assets</h3>
            <p>CSS, images, fonts, and script files are fetched with conservative limits and deduped by content hash.</p>
          </article>
          <article class="panel card">
            <h3>Screenshot fallback</h3>
            <p>Thin or JS-heavy pages can fall back to screenshot capture when Browser Rendering is configured.</p>
          </article>
        </section>
      </main>
      <script dangerouslySetInnerHTML={{ __html: clientScript }} />
    </body>
  </html>
);

const clientScript = `
const form = document.getElementById('snapshot-form');
const status = document.getElementById('status');
const statusBody = document.getElementById('status-body');

function show(message){ status.classList.add('visible'); statusBody.textContent = message; }

async function poll(id){
  for(let i=0;i<20;i++){
    const res = await fetch('/snapshot/' + id);
    if(!res.ok) break;
    const data = await res.json();
    show(JSON.stringify(data, null, 2));
    if(['completed','screenshot_only','failed'].includes(data.snapshot.status)){
      window.location.href = '/snapshot/' + id + '/view';
      return;
    }
    await new Promise(r => setTimeout(r, 1500));
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  show('Queueing snapshot…');
  const res = await fetch('/snapshot', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: formData.get('url') }) });
  const data = await res.json();
  show(JSON.stringify(data, null, 2));
  if(data.snapshot?.id) poll(data.snapshot.id);
});
`;

type ReplaySnapshot = {
  id: string;
  url: string;
  normalizedUrl: string;
  createdAt: Date;
  status: string;
};

const replayShell = `
:root{--bar:#211b18;--bar-2:#302722;--paper:#fff7ea;--ink:#1f1a17;--muted:#d8cbbc;--accent:#e27a55;--line:rgba(255,247,234,.18)}
*{box-sizing:border-box}
html,body{height:100%;margin:0;background:#111;color:var(--paper);font-family:Georgia,Cambria,'Times New Roman',serif}
body{display:flex;flex-direction:column;overflow:hidden}
.archive-banner{position:relative;z-index:10;background:linear-gradient(135deg,var(--bar),var(--bar-2));border-bottom:1px solid rgba(0,0,0,.35);box-shadow:0 12px 30px rgba(0,0,0,.28)}
.archive-details{max-width:1280px;margin:0 auto;padding:0 16px}
.archive-summary{display:flex;align-items:center;gap:14px;min-height:54px;cursor:pointer;list-style:none}
.archive-summary::-webkit-details-marker{display:none}
.archive-toggle{display:grid;place-items:center;width:28px;height:28px;border:1px solid var(--line);border-radius:999px;color:var(--accent);font:700 16px/1 ui-monospace,SFMono-Regular,Menlo,monospace;transition:transform .16s ease}
.archive-details[open] .archive-toggle{transform:rotate(90deg)}
.archive-title{font-weight:700;letter-spacing:-.01em;white-space:nowrap}
.archive-meta{min-width:0;color:var(--muted);font:12px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.archive-panel{padding:0 0 16px 42px}
.archive-empty{margin:0;color:var(--muted);font-size:14px}
.archive-list{display:flex;flex-wrap:wrap;gap:8px;margin:0;padding:0;list-style:none}
.archive-link{display:inline-flex;align-items:center;border:1px solid var(--line);border-radius:999px;padding:8px 11px;background:rgba(255,247,234,.08);color:var(--paper);font:12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;text-decoration:none}
.archive-link:hover{border-color:rgba(226,122,85,.7);background:rgba(226,122,85,.16)}
.replay-frame{display:block;width:100%;flex:1;border:0;background:#fff;min-height:0}
@media (max-width:700px){.archive-summary{align-items:flex-start;flex-direction:column;gap:6px;padding:10px 0}.archive-toggle{position:absolute;right:16px;top:12px}.archive-title{padding-right:42px}.archive-meta{width:100%;white-space:normal}.archive-panel{padding:2px 0 14px}.archive-list{display:grid;grid-template-columns:1fr}.archive-link{justify-content:center}}
`;

function formatSnapshotTimestamp(value: Date) {
  return value.toISOString().replace('T', ' ').replace('.000Z', ' UTC');
}

export const ReplayPage: FC<{ snapshot: ReplaySnapshot; previousSnapshots: ReplaySnapshot[] }> = ({ snapshot, previousSnapshots }) => (
  <html>
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Snapshot {snapshot.id}</title>
      <style>{replayShell}</style>
    </head>
    <body>
      <header class="archive-banner">
        <details class="archive-details">
          <summary class="archive-summary">
            <span class="archive-toggle" aria-hidden="true">›</span>
            <span class="archive-title">Backway archive history</span>
            <span class="archive-meta">
              Current: {formatSnapshotTimestamp(snapshot.createdAt)} • {snapshot.normalizedUrl}
            </span>
          </summary>
          <div class="archive-panel">
            {previousSnapshots.length > 0 ? (
              <ol class="archive-list">
                {previousSnapshots.map((previous) => (
                  <li>
                    <a class="archive-link" href={`/snapshot/${previous.id}/view`} title={previous.normalizedUrl}>
                      {formatSnapshotTimestamp(previous.createdAt)}
                    </a>
                  </li>
                ))}
              </ol>
            ) : (
              <p class="archive-empty">No previous snapshots for this URL yet.</p>
            )}
          </div>
        </details>
      </header>
      <iframe class="replay-frame" src={`/snapshot/${snapshot.id}/content`} title={`Archived snapshot ${snapshot.id}`} />
    </body>
  </html>
);

export const ScreenshotPage: FC<{ snapshotId: string }> = ({ snapshotId }) => (
  <html>
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Snapshot {snapshotId}</title>
      <style>{`body{margin:0;font-family:Georgia,serif;background:#111;color:#f8f8f8}header{padding:14px 18px;background:#1c1c1c;font-size:14px}img{display:block;max-width:100%;height:auto;margin:0 auto}`}</style>
    </head>
    <body>
      <header>Backway screenshot fallback • snapshot {snapshotId}</header>
      <img src={`/snapshot/${snapshotId}/screenshot`} alt={`Screenshot for ${snapshotId}`} />
    </body>
  </html>
);
