// ============================================================
// Meu Estudo Organizado — motor do Pomodoro
// Usa horário final (timestamp) em vez de decremento por segundo,
// então o tempo continua correto mesmo com a aba em segundo plano.
// ============================================================
window.MEO = window.MEO || {};

(function (MEO) {
  'use strict';

  const MODES = { foco: 'foco', pausaCurta: 'pausaCurta', pausaLonga: 'pausaLonga' };

  const engine = {
    mode: MODES.foco,
    running: false,
    endAt: null,        // timestamp (ms) de término
    remainingMs: null,  // usado quando pausado
    cyclesToday: 0,
    subjectId: null,
    activity: '',
    taskId: null,
    tickHandle: null,
    listeners: [],
    ended: [],
  };

  function durations() {
    const s = (MEO.db && MEO.db.state.settings.pomodoro) || { foco: 25, pausaCurta: 5, pausaLonga: 15 };
    return {
      foco: s.foco * 60 * 1000,
      pausaCurta: s.pausaCurta * 60 * 1000,
      pausaLonga: s.pausaLonga * 60 * 1000
    };
  }

  function emit() {
    engine.listeners.forEach(fn => { try { fn(engine); } catch (e) { console.error(e); } });
  }

  function tick() {
    if (!engine.running) return;
    const remaining = engine.endAt - Date.now();
    if (remaining <= 0) {
      finishCycle();
      return;
    }
    emit();
  }

  function finishCycle() {
    engine.running = false;
    clearInterval(engine.tickHandle);
    engine.remainingMs = 0;
    if (engine.mode === MODES.foco) {
      engine.cyclesToday += 1;
      const mins = Math.round(durations().foco / 60000);
      MEO.pomodoro.onSessionComplete && MEO.pomodoro.onSessionComplete(mins, engine.subjectId, engine.activity, engine.taskId);
    }
    engine.ended.forEach(fn => { try { fn(engine.mode); } catch (e) { console.error(e); } });
    emit();
  }

  MEO.pomodoro = {
    MODES,

    onTick(fn) { engine.listeners.push(fn); },
    onCycleEnd(fn) { engine.ended.push(fn); },
    onSessionComplete: null, // definido em app.js

    getState() {
      let remaining;
      if (engine.running) remaining = Math.max(0, engine.endAt - Date.now());
      else remaining = engine.remainingMs != null ? engine.remainingMs : durations()[engine.mode];
      return {
        mode: engine.mode,
        running: engine.running,
        remainingMs: remaining,
        totalMs: durations()[engine.mode],
        cyclesToday: engine.cyclesToday,
        subjectId: engine.subjectId,
        activity: engine.activity,
        taskId: engine.taskId
      };
    },

    setMode(mode) {
      engine.running = false;
      clearInterval(engine.tickHandle);
      engine.mode = mode;
      engine.remainingMs = durations()[mode];
      emit();
    },

    setSubject(id) { engine.subjectId = id; if (!id) { engine.taskId = null; } emit(); },
    setActivity(text) { engine.activity = text; emit(); },
    setTask(id, label) { engine.taskId = id; engine.activity = label != null ? label : engine.activity; emit(); },

    start() {
      if (engine.running) return;
      const dur = engine.remainingMs != null ? engine.remainingMs : durations()[engine.mode];
      engine.endAt = Date.now() + dur;
      engine.running = true;
      clearInterval(engine.tickHandle);
      engine.tickHandle = setInterval(tick, 250);
      emit();
    },

    pause() {
      if (!engine.running) return;
      engine.remainingMs = Math.max(0, engine.endAt - Date.now());
      engine.running = false;
      clearInterval(engine.tickHandle);
      emit();
    },

    toggle() { engine.running ? MEO.pomodoro.pause() : MEO.pomodoro.start(); },

    reset() {
      engine.running = false;
      clearInterval(engine.tickHandle);
      engine.remainingMs = durations()[engine.mode];
      emit();
    },

    skip() { finishCycle(); }
  };

})(window.MEO);
