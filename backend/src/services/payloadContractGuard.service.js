const logger = require('../utils/logger');

class PayloadContractGuard {
  /**
   * Validate raw incoming signal payload from FX Desk Pro.
   * Produces explicit contract mismatch errors if incompatible.
   */
  validate(canonicalPayload) {
    if (!canonicalPayload || typeof canonicalPayload !== 'object') {
      const err = '[PayloadContractGuard] Invalid payload: payload must be a non-null object';
      logger.error(err);
      return { valid: false, error: err, reason: 'null_or_non_object_payload' };
    }

    const id = canonicalPayload.id;
    if (!id) {
      const err = '[PayloadContractGuard] Contract Mismatch: Missing ID field (id)';
      logger.error(err);
      return { valid: false, error: err, reason: 'missing_id_field' };
    }

    const pair = canonicalPayload.pair;
    if (!pair || typeof pair !== 'string') {
      const err = `[PayloadContractGuard] Contract Mismatch on signal ${id}: Missing or invalid pair field`;
      logger.error(err);
      return { valid: false, error: err, reason: 'missing_pair_field' };
    }

    const direction = canonicalPayload.direction;
    if (!direction || typeof direction !== 'string') {
      const err = `[PayloadContractGuard] Contract Mismatch on signal ${id}: Missing or invalid direction field`;
      logger.error(err);
      return { valid: false, error: err, reason: 'missing_direction_field' };
    }

    const entryPrice = parseFloat(canonicalPayload.entryPrice);
    if (isNaN(entryPrice) || entryPrice <= 0) {
      const err = `[PayloadContractGuard] Contract Mismatch on signal ${id}: Missing or invalid entry price [${canonicalPayload.entryPrice}]`;
      logger.error(err);
      return { valid: false, error: err, reason: 'invalid_entry_price' };
    }

    const originalSl = parseFloat(canonicalPayload.originalSl);
    if (isNaN(originalSl) || originalSl <= 0) {
      const err = `[PayloadContractGuard] Contract Mismatch on signal ${id}: Missing or invalid stop loss [${canonicalPayload.originalSl}]`;
      logger.error(err);
      return { valid: false, error: err, reason: 'invalid_stop_loss' };
    }

    const targets = canonicalPayload.targets;
    if (!Array.isArray(targets) || targets.length === 0) {
      const err = `[PayloadContractGuard] Contract Mismatch on signal ${id}: Missing targets array or TP values`;
      logger.error(err);
      return { valid: false, error: err, reason: 'missing_targets' };
    }

    return { valid: true };
  }
}

module.exports = new PayloadContractGuard();
