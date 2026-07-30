const activeSignalManager = require('./activeSignalManager.service');
const analyticsEvents = require('../events/analyticsEvents');
const logger = require('../utils/logger');

class MonitoringEngine {
  /**
   * Flat Memory Architecture:
   * MonitoringEngine holds NO internal state, arrays, or maps of signals.
   * It relies exclusively on ActiveSignalManager as the single source of truth.
   */

  /**
   * Process a single market price tick for a symbol in one evaluation pass.
   * Short-circuits finished thresholds, updates signal hit flags in-place, and emits analytics events.
   */
  processPriceTick(symbol, currentPrice) {
    const price = parseFloat(currentPrice);
    if (!symbol || isNaN(price)) {
      return { evaluatedCount: 0, updatedHitsCount: 0, completedCount: 0 };
    }

    const pair = String(symbol).toUpperCase();
    const activeSignals = activeSignalManager.getActiveSignals();
    
    // Filter active signals for the target pair
    const pairSignals = activeSignals.filter((sig) => sig.pair === pair && sig.status === 'ACTIVE');

    if (pairSignals.length === 0) {
      return { evaluatedCount: 0, updatedHitsCount: 0, completedCount: 0 };
    }

    let updatedHitsCount = 0;
    let completedCount = 0;

    // Single pass loop over matching pair signals
    for (const signal of pairSignals) {
      const { signalId, channel, direction, tp1, tp2, tp3, originalSl, derivedSl8, derivedSl10, derivedSl12, hitFlags } = signal;
      const isBuy = direction === 'BUY';
      let hitsChangedThisTick = false;

      if (isBuy) {
        // --- BUY EVALUATION ---
        if (!hitFlags.tp1Hit && tp1 > 0 && price >= tp1) {
          hitFlags.tp1Hit = true;
          hitsChangedThisTick = true;
          analyticsEvents.emit('hit_updated', { signalId, channel, pair, hitType: 'tp1Hit' });
        }
        if (!hitFlags.tp2Hit && tp2 > 0 && price >= tp2) {
          hitFlags.tp2Hit = true;
          hitsChangedThisTick = true;
          analyticsEvents.emit('hit_updated', { signalId, channel, pair, hitType: 'tp2Hit' });
        }
        if (!hitFlags.tp3Hit && tp3 > 0 && price >= tp3) {
          hitFlags.tp3Hit = true;
          hitsChangedThisTick = true;
          analyticsEvents.emit('hit_updated', { signalId, channel, pair, hitType: 'tp3Hit' });
        }
        if (!hitFlags.slHit && originalSl > 0 && price <= originalSl) {
          hitFlags.slHit = true;
          hitsChangedThisTick = true;
          analyticsEvents.emit('hit_updated', { signalId, channel, pair, hitType: 'slHit' });
        }
        if (!hitFlags.derivedSl8Hit && derivedSl8 > 0 && price <= derivedSl8) {
          hitFlags.derivedSl8Hit = true;
          hitsChangedThisTick = true;
          analyticsEvents.emit('hit_updated', { signalId, channel, pair, hitType: 'derivedSl8Hit' });
        }
        if (!hitFlags.derivedSl10Hit && derivedSl10 > 0 && price <= derivedSl10) {
          hitFlags.derivedSl10Hit = true;
          hitsChangedThisTick = true;
          analyticsEvents.emit('hit_updated', { signalId, channel, pair, hitType: 'derivedSl10Hit' });
        }
        if (!hitFlags.derivedSl12Hit && derivedSl12 > 0 && price <= derivedSl12) {
          hitFlags.derivedSl12Hit = true;
          hitsChangedThisTick = true;
          analyticsEvents.emit('hit_updated', { signalId, channel, pair, hitType: 'derivedSl12Hit' });
        }
      } else {
        // --- SELL EVALUATION ---
        if (!hitFlags.tp1Hit && tp1 > 0 && price <= tp1) {
          hitFlags.tp1Hit = true;
          hitsChangedThisTick = true;
          analyticsEvents.emit('hit_updated', { signalId, channel, pair, hitType: 'tp1Hit' });
        }
        if (!hitFlags.tp2Hit && tp2 > 0 && price <= tp2) {
          hitFlags.tp2Hit = true;
          hitsChangedThisTick = true;
          analyticsEvents.emit('hit_updated', { signalId, channel, pair, hitType: 'tp2Hit' });
        }
        if (!hitFlags.tp3Hit && tp3 > 0 && price <= tp3) {
          hitFlags.tp3Hit = true;
          hitsChangedThisTick = true;
          analyticsEvents.emit('hit_updated', { signalId, channel, pair, hitType: 'tp3Hit' });
        }
        if (!hitFlags.slHit && originalSl > 0 && price >= originalSl) {
          hitFlags.slHit = true;
          hitsChangedThisTick = true;
          analyticsEvents.emit('hit_updated', { signalId, channel, pair, hitType: 'slHit' });
        }
        if (!hitFlags.derivedSl8Hit && derivedSl8 > 0 && price >= derivedSl8) {
          hitFlags.derivedSl8Hit = true;
          hitsChangedThisTick = true;
          analyticsEvents.emit('hit_updated', { signalId, channel, pair, hitType: 'derivedSl8Hit' });
        }
        if (!hitFlags.derivedSl10Hit && derivedSl10 > 0 && price >= derivedSl10) {
          hitFlags.derivedSl10Hit = true;
          hitsChangedThisTick = true;
          analyticsEvents.emit('hit_updated', { signalId, channel, pair, hitType: 'derivedSl10Hit' });
        }
        if (!hitFlags.derivedSl12Hit && derivedSl12 > 0 && price >= derivedSl12) {
          hitFlags.derivedSl12Hit = true;
          hitsChangedThisTick = true;
          analyticsEvents.emit('hit_updated', { signalId, channel, pair, hitType: 'derivedSl12Hit' });
        }
      }

      if (hitsChangedThisTick) {
        updatedHitsCount++;
        logger.info(`[MonitoringEngine] Signal ${signalId} (${pair}) updated hit flags at price ${price}`);
      }

      // Signal Completion & Eviction Condition: Full TP (TP3) OR Original SL hit
      const isCompleted = hitFlags.tp3Hit || hitFlags.slHit;
      if (isCompleted) {
        signal.status = 'COMPLETED';
        activeSignalManager.removeActiveSignal(signalId);
        completedCount++;
        
        analyticsEvents.emit('signal_completed', {
          signalId,
          channel,
          pair,
          status: 'COMPLETED',
          hitFlags: { ...hitFlags },
        });

        logger.info(`[MonitoringEngine] Signal ${signalId} marked COMPLETED and evicted from active memory`);
      }
    }

    return {
      symbol: pair,
      price,
      evaluatedCount: pairSignals.length,
      updatedHitsCount,
      completedCount,
    };
  }
}

module.exports = new MonitoringEngine();

