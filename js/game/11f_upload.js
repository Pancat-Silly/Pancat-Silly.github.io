// ===================== jobs uploaded by the room host (dev tool result txt) =====================
// the host loads a result txt -> it runs locally and its hash+name goes into the host's presence (uj).
// everyone who doesn't have it asks for it; the host sends the file in 16KB chunks over the side channel (NET.blob).
// every client keeps what it received, so a new host can hand it out too. jobs get a blue "업로드됨" tag.
// jobs made with the dev tool and shipped with the game (tools/modjobs/<job>/ -> js/data/jobs/<job>.js, one file per job): loaded through the same mod API
const BUILTIN = {
  async load() {
    if (typeof BUILTIN_JOBS === 'undefined') return;
    for (const J of BUILTIN_JOBS) {
      for (const k in J.snd) { try { await MOD.addSound(k, J.snd[k]); } catch (e) { } }
      const ids = []; MOD.upIds = ids;
      MOD.curCode = J.code; try { new Function('APVP', 'api', J.code + '\n//# sourceURL=builtin_' + J.file + '.js')(APVP, APVP.api); } catch (e) { console.error('builtin job', J.file, e); }
      finally { MOD.upIds = null; MOD.curCode = ''; }
      for (const id of ids) if (JOBS[id]) { JOBS[id].builtin = true; JOBS[id].desc = String(JOBS[id].desc || '').replace(/^커스텀\s*·\s*/, '미완성 직업 · '); UI.addJobButton(id); }
    }
    UI.menuDirty = true;
  },
};
const UPJ = {
  files: new Map(), // hash -> { txt, name, ids, ok }
  parts: {}, // hash -> { n, got: [], cnt, t }
  sentT: {}, busy: new Set(),
  hash(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36) + s.length.toString(36); },
  async run(h, txt) {
    const f0 = this.files.get(h); if (f0 && f0.ok) return true;
    const P = DEV.parse(txt); if (!P.code) { UI.chat('§c업로드한 파일에서 JS 코드를 찾지 못했어요 (개발 도구 결과물 txt를 올려 주세요)'); return false; }
    if (P.snd) for (const line of P.snd.split('\n')) { const m = line.match(/^([^\s:]+)\s*:\s*(data:audio\/[^\s]+)/); if (m) { try { await MOD.addSound(m[1], m[2]); } catch (e) { } } }
    const ids = []; MOD.upIds = ids;
    MOD.curCode = P.code; try { new Function('APVP', 'api', P.code + '\n//# sourceURL=uploaded_job.js')(APVP, APVP.api); }
    catch (e) { UI.chat('§c업로드된 직업 코드 오류: ' + e.message); }
    finally { MOD.upIds = null; MOD.curCode = ''; }
    for (const id of ids) if (JOBS[id]) { JOBS[id].uploaded = true; UI.addJobButton(id); }
    const name = ids.map(i => JOBS[i] ? JOBS[i].icon + ' ' + JOBS[i].name : i).join(', ');
    this.files.set(h, { txt, name, ids, ok: ids.length > 0 }); UI.menuDirty = true; if (UI.upStatus) UI.upStatus();
    return ids.length > 0;
  },
  async upload(file) {
    if (!file) return;
    if (NET.mode !== 'off' && !G.isHost()) { UI.chat('§c직업 업로드는 방장만 할 수 있어요'); return; }
    if (NET.mode === 'room') UI.chat('§e이 연결 방식(Claude 방)에서는 다른 사람에게 전송이 안 돼요. 나만 쓸 수 있어요');
    const txt = await file.text(); if (txt.length > 4e6) { UI.chat('§c파일이 너무 커요 (4MB 이하)'); return; }
    const h = this.hash(txt); const ok = await this.run(h, txt);
    if (ok) { const f = this.files.get(h); UI.chat('§b직업 업로드 완료: ' + f.name + (NET.mode !== 'off' ? ' · 방 사람들에게 보내는 중' : '')); this.sendFile(h); }
  },
  // presence: only the host advertises (max 8 files)
  list() { const L = []; for (const [h, f] of this.files) if (f.ok) L.push([h, f.name.slice(0, 40)]); return L.slice(-8); },
  onPresence(pres) {
    if (!pres.H || !Array.isArray(pres.uj)) return;
    for (const e of pres.uj) { const h = e && e[0]; if (typeof h === 'string' && !this.files.has(h) && !this.busy.has(h)) this.want(h); }
  },
  want(h) { const p = this.parts[h] || (this.parts[h] = { n: 0, got: [], cnt: 0, t: 0 }); const now = performance.now(); if (now - p.t < 5000) return; p.t = now; NET.blob({ want: h }); },
  sendFile(h) {
    const f = this.files.get(h); if (!f || !f.ok || NET.mode === 'off' || NET.mode === 'room') return; const now = performance.now(); if (now - (this.sentT[h] || 0) < 2500) return; this.sentT[h] = now;
    const CH = 16000, t = f.txt, n = Math.ceil(t.length / CH); for (let i = 0; i < n; i++) NET.blob({ h, i, n, d: t.slice(i * CH, (i + 1) * CH) });
  },
  onBlob(d) {
    if (!d) return;
    if (d.want) { if (G.isHost() && this.files.has(d.want)) this.sendFile(d.want); return; }
    const h = d.h; if (typeof h !== 'string' || this.files.has(h) || this.busy.has(h) || typeof d.d !== 'string' || !(d.n > 0 && d.n < 400) || !(d.i >= 0 && d.i < d.n)) return;
    const p = this.parts[h] || (this.parts[h] = { n: 0, got: [], cnt: 0, t: 0 }); if (p.n !== d.n) { p.n = d.n; p.got = []; p.cnt = 0; }
    if (p.got[d.i] === undefined) { p.got[d.i] = d.d; p.cnt++; }
    if (p.cnt === p.n) { const txt = p.got.join(''); delete this.parts[h]; if (this.hash(txt) !== h) return;
      this.busy.add(h); // duplicate chunks (sent to several people at once) are ignored while it loads
      this.run(h, txt).finally(() => this.busy.delete(h)).then(ok => UI.chat(ok ? '§b방장이 업로드한 직업을 받았어요: ' + this.files.get(h).name : '§c방장이 업로드한 직업을 불러오지 못했어요')); }
  },
};
