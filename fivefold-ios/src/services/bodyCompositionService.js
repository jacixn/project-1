/**
 * bodyCompositionService.js
 *
 * Calculates a full body composition breakdown from basic profile data
 * (gender, age, heightCm, weightKg, bodyFatPercent, activityLevel).
 *
 * Uses established research formulas:
 * - BMI: Quetelet index
 * - BMR: Mifflin-St Jeor
 * - Body fat estimation: US Navy / user-supplied
 * - Fat-free mass: weight × (1 - bf%)
 * - Skeletal muscle mass: Janssen et al. equation
 * - Bone mass: Heymsfield et al. approximation from lean mass
 * - Body water: Watson formula
 * - Visceral fat: age/gender/BMI regression proxy
 * - Subcutaneous fat: total body fat − visceral estimate
 * - Protein mass: ~19.4% of lean body mass
 * - Muscle rate: skeletal muscle / weight
 * - Body age: deviation model comparing metrics to norms
 */

class BodyCompositionService {
  /**
   * Main entry — returns a full body composition object.
   * @param {Object} profile - { gender, age, heightCm, weightKg, bodyFatPercent, activityLevel }
   * @returns {Object} all body composition metrics
   */
  calculate(profile) {
    const { gender, age, heightCm, weightKg, bodyFatPercent, activityLevel } = profile;
    if (!gender || !age || !heightCm || !weightKg) return null;

    const isMale = gender === 'male';
    const heightM = heightCm / 100;
    const bf = bodyFatPercent || this._estimateBodyFat(isMale, age, heightCm, weightKg);

    // ── Core metrics ──
    const bmi = this._round1(weightKg / (heightM * heightM));
    const bmr = this._calcBMR(isMale, weightKg, heightCm, age);

    // ── Fat metrics ──
    const fatMassKg = this._round1(weightKg * (bf / 100));
    const fatFreeKg = this._round1(weightKg - fatMassKg);

    // Visceral fat rating (1-59 scale, like scales use)
    const visceralFat = this._calcVisceralFat(isMale, age, bmi, bf);

    // Subcutaneous fat % = total body fat % minus visceral contribution
    const visceralFatPercent = this._round1(visceralFat * 0.45); // approximate mapping
    const subcutaneousFat = this._round1(Math.max(0, bf - visceralFatPercent));

    // ── Muscle metrics ──
    // Skeletal muscle mass (Janssen et al. 2000 equation, simplified)
    const skeletalMuscleMassKg = this._calcSkeletalMuscle(isMale, age, heightCm, weightKg, bf);
    const skeletalMusclePercent = this._round1((skeletalMuscleMassKg / weightKg) * 100);

    // Total muscle mass ≈ skeletal muscle × 1.15 (adds smooth/cardiac muscle ~15% extra)
    const muscleMassKg = this._round1(skeletalMuscleMassKg * 1.15);

    // Muscle rate = skeletal muscle % (the standard metric body composition scales use)
    const muscleRate = skeletalMusclePercent;

    // ── Bone mass ──
    // DEXA-based estimates: ~5.0% of lean mass for males, ~5.5% for females
    // (avg male bone mineral content ~2.5-3.2 kg, female ~2.0-2.8 kg)
    const boneFraction = isMale ? 0.050 : 0.055;
    const boneMassKg = this._round1(fatFreeKg * boneFraction);

    // ── Body water ──
    // Watson formula
    const bodyWaterL = this._calcBodyWater(isMale, age, heightCm, weightKg);
    const bodyWaterPercent = this._round1((bodyWaterL / weightKg) * 100);

    // ── Protein ──
    // Protein is approximately 19.4% of lean body mass
    const proteinPercent = this._round1(fatFreeKg * 0.194 / weightKg * 100);

    // ── Body age ──
    const bodyAge = this._calcBodyAge(isMale, age, heightCm, bmi, bf, muscleRate, bodyWaterPercent);

    // ── TDEE ──
    const activityMultipliers = {
      sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, veryActive: 1.9,
    };
    const tdee = Math.round(bmr * (activityMultipliers[activityLevel] || 1.55));

    return {
      // Basic
      isMale,
      age,
      weight: weightKg,
      bmi,
      bmr,
      tdee,

      // Fat
      bodyFat: this._round1(bf),
      fatMass: fatMassKg,
      fatFreeWeight: fatFreeKg,
      visceralFat: this._round1(visceralFat),
      subcutaneousFat,

      // Muscle
      skeletalMuscle: skeletalMusclePercent,
      skeletalMuscleMass: skeletalMuscleMassKg,
      muscleMass: muscleMassKg,
      muscleRate,

      // Other
      boneMass: boneMassKg,
      bodyWater: bodyWaterPercent,
      bodyWaterLitres: this._round1(bodyWaterL),
      protein: proteinPercent,
      bodyAge: Math.round(bodyAge),

      // Ideal weight range (BMI 20-24.9)
      idealWeightLow: this._round1(20 * heightM * heightM),
      idealWeightHigh: this._round1(24.9 * heightM * heightM),

      // Daily water intake recommendation (ml) — based on weight + activity
      dailyWaterMl: Math.round(weightKg * 33 * (activityMultipliers[activityLevel] || 1.55) / 1.55 * (activityLevel === 'active' || activityLevel === 'veryActive' ? 1.2 : 1)),
      dailyWaterL: this._round1(weightKg * 33 * (activityMultipliers[activityLevel] || 1.55) / 1.55 * (activityLevel === 'active' || activityLevel === 'veryActive' ? 1.2 : 1) / 1000),

      // Health Score (0-100)
      healthScore: this._calcHealthScore(isMale, bmi, bf, muscleRate, bodyWaterPercent, visceralFat, bodyAge, age, heightCm),

      // Ratings / status
      bmiStatus: this._bmiStatus(bmi),
      bodyFatStatus: this._bodyFatStatus(isMale, age, bf),
      visceralFatStatus: this._visceralFatStatus(visceralFat),
      muscleStatus: this._muscleStatus(isMale, age, muscleRate),
      bodyWaterStatus: this._bodyWaterStatus(isMale, age, bodyWaterPercent),
    };
  }

  // ────────────────────────────────────────
  //  INTERNAL CALCULATORS
  // ────────────────────────────────────────

  _calcBMR(isMale, weight, heightCm, age) {
    if (isMale) return Math.round(10 * weight + 6.25 * heightCm - 5 * age + 5);
    return Math.round(10 * weight + 6.25 * heightCm - 5 * age - 161);
  }

  _estimateBodyFat(isMale, age, heightCm, weightKg) {
    // Deurenberg formula (rough estimate when user hasn't provided BF%)
    const heightM = heightCm / 100;
    const bmi = weightKg / (heightM * heightM);
    const genderFactor = isMale ? 1 : 0;
    return Math.max(5, 1.20 * bmi + 0.23 * age - 10.8 * genderFactor - 5.4);
  }

  _calcSkeletalMuscle(isMale, age, heightCm, weightKg, bf) {
    // Simplified Janssen equation adapted
    const leanMass = weightKg * (1 - bf / 100);
    const base = isMale ? leanMass * 0.56 : leanMass * 0.50;
    // Age-related decline: ~0.5% per year after 30
    const ageDecline = age > 30 ? (age - 30) * 0.003 * base : 0;
    return this._round1(Math.max(base - ageDecline, leanMass * 0.35));
  }

  _calcBodyWater(isMale, age, heightCm, weightKg) {
    // Watson formula (1980)
    if (isMale) {
      return 2.447 - 0.09156 * age + 0.1074 * heightCm + 0.3362 * weightKg;
    }
    return -2.097 + 0.1069 * heightCm + 0.2466 * weightKg;
  }

  _calcVisceralFat(isMale, age, bmi, bf) {
    // Empirical regression proxy (scales typically use bioimpedance, this is an approximation)
    let base;
    if (isMale) {
      base = (bmi * 0.6) + (age * 0.15) - 8;
    } else {
      base = (bmi * 0.5) + (age * 0.12) - 7;
    }
    // Clamp to 1-30 range (consumer scales usually show 1-59)
    return Math.max(1, Math.min(30, this._round1(base)));
  }

  _calcBodyAge(isMale, chronologicalAge, heightCm, bmi, bf, muscleRate, bodyWater) {
    let deviation = 0;

    const idealBMI = this._getIdealBMI(isMale, chronologicalAge, heightCm);
    deviation += (bmi - idealBMI) * 0.6;

    const idealBF = this._getIdealBodyFat(isMale, chronologicalAge);
    deviation += (bf - idealBF) * 0.3;

    const idealMuscle = this._getIdealMuscleRate(isMale, chronologicalAge);
    deviation -= (muscleRate - idealMuscle) * 0.3;

    const idealWater = this._getIdealBodyWater(isMale, chronologicalAge);
    deviation -= (bodyWater - idealWater) * 0.15;

    return Math.max(18, Math.min(80, Math.round(chronologicalAge + deviation)));
  }

  // ────────────────────────────────────────
  //  AGE-ADJUSTED THRESHOLDS
  //
  //  Every threshold slides with age, height, and gender so scoring
  //  compares against the peak for someone like YOU — not a universal
  //  ideal. Based on ACE/ACSM body composition classification charts.
  // ────────────────────────────────────────

  _getBodyFatThresholds(isMale, age) {
    const ageShift = Math.max(0, age - 25) * 0.25;
    if (isMale) {
      return {
        excellent: 8 + ageShift,
        good: 11 + ageShift,
        avg: 14 + ageShift,
        high: 18 + ageShift * 0.8,
      };
    }
    return {
      excellent: 16 + ageShift,
      good: 20 + ageShift,
      avg: 24 + ageShift,
      high: 29 + ageShift * 0.8,
    };
  }

  _getIdealBodyFat(isMale, age) {
    const ageShift = Math.max(0, age - 25) * 0.25;
    return isMale ? 10 + ageShift : 18 + ageShift;
  }

  _getIdealMuscleRate(isMale, age) {
    const ageDecline = Math.max(0, age - 30) * 0.12;
    return isMale ? Math.max(30, 40 - ageDecline) : Math.max(22, 30 - ageDecline);
  }

  _getIdealBodyWater(isMale, age) {
    const ageDecline = Math.max(0, age - 25) * 0.08;
    return isMale ? Math.max(48, 57 - ageDecline) : Math.max(43, 52 - ageDecline);
  }

  _getIdealBMI(isMale, age, heightCm) {
    let ideal = isMale ? 22.5 : 21.5;
    ideal += Math.max(0, age - 30) * 0.03;
    if (heightCm) {
      const avgHeight = isMale ? 175 : 163;
      ideal += (avgHeight - heightCm) * 0.012;
    }
    return Math.max(20, Math.min(24.5, ideal));
  }

  // ────────────────────────────────────────
  //  STATUS LABELS
  // ────────────────────────────────────────

  _bmiStatus(bmi) {
    if (bmi < 18.5) return { label: 'Underweight', color: '#3B82F6' };
    if (bmi < 25) return { label: 'Normal', color: '#10B981' };
    if (bmi < 30) return { label: 'Overweight', color: '#F59E0B' };
    return { label: 'Obese', color: '#EF4444' };
  }

  _bodyFatStatus(isMale, age, bf) {
    const t = this._getBodyFatThresholds(isMale, age);
    const essentialMax = isMale ? 6 : 14;
    const ranges = [
      { max: essentialMax, label: 'Essential', color: '#3B82F6' },
      { max: t.good, label: 'Athletic', color: '#3B82F6' },
      { max: t.avg, label: 'Fitness', color: '#10B981' },
      { max: t.high, label: 'Average', color: '#F59E0B' },
    ];
    const match = ranges.find(r => bf < r.max);
    return match || { label: 'Above Average', color: '#EF4444' };
  }

  _visceralFatStatus(vf) {
    if (vf <= 9) return { label: 'Healthy', color: '#10B981' };
    if (vf <= 14) return { label: 'Elevated', color: '#F59E0B' };
    return { label: 'High', color: '#EF4444' };
  }

  _muscleStatus(isMale, age, rate) {
    const ideal = this._getIdealMuscleRate(isMale, age);
    const vhGap = isMale ? 4 : 6;
    const hGap = isMale ? 0 : 1;
    const nGap = isMale ? -7 : -6;
    if (rate >= ideal + vhGap) return { label: 'Very High', color: '#10B981' };
    if (rate >= ideal + hGap) return { label: 'High', color: '#10B981' };
    if (rate >= ideal + nGap) return { label: 'Normal', color: '#3B82F6' };
    return { label: 'Below Average', color: '#F59E0B' };
  }

  _bodyWaterStatus(isMale, age, pct) {
    const ideal = this._getIdealBodyWater(isMale, age);
    const threshold = ideal - 7;
    if (pct >= threshold + 10) return { label: 'Well Hydrated', color: '#10B981' };
    if (pct >= threshold) return { label: 'Normal', color: '#3B82F6' };
    return { label: 'Low', color: '#F59E0B' };
  }

  // ────────────────────────────────────────
  //  HEALTH SCORE (0-100) — Personalised & brutally honest
  //
  //  All thresholds are age-, height-, and gender-adjusted so the score
  //  compares you to the peak version of someone YOUR age, height, and
  //  gender — not a universal ideal.
  //
  //  80+ = you look and ARE fit for your demographic.
  //  50 = average adult. Still strict — "average" is mediocre.
  //
  //  Target ranges:
  //    90-100  Elite / athlete
  //    75-89   Genuinely fit
  //    60-74   Decent, room to improve
  //    40-59   Average / mediocre
  //    20-39   Out of shape
  //    5-19    Serious health concerns
  // ────────────────────────────────────────

  _calcHealthScore(isMale, bmi, bf, muscleRate, bodyWater, visceralFat, bodyAge, realAge, heightCm) {
    let score = 100;

    // ── BMI — shifted by age + height so the ideal window tracks the user ──
    const idealBMI = this._getIdealBMI(isMale, realAge, heightCm);
    const bmiShift = idealBMI - (isMale ? 22.5 : 21.5);
    const bmiAdj = bmi - bmiShift;

    // Note: BMI penalties are reduced because body fat % already captures most
    // of the same signal. Heavy BMI deductions on top of BF deductions
    // double-counts adiposity and crushes the score for ordinary cases.
    if (bmiAdj < 16) score -= 18;
    else if (bmiAdj < 18.5) score -= 6 + (18.5 - bmiAdj) * 2.5;
    else if (bmiAdj < 20) score -= (20 - bmiAdj) * 1.2;
    else if (bmiAdj >= 40) score -= 22;
    else if (bmiAdj >= 35) score -= 16 + (bmiAdj - 35) * 1.2;
    else if (bmiAdj >= 30) score -= 9 + (bmiAdj - 30) * 1.4;
    else if (bmiAdj >= 27) score -= 4 + (bmiAdj - 27) * 1.7;
    else if (bmiAdj >= 25) score -= (bmiAdj - 25) * 2;
    else if (bmiAdj >= 23) score -= (bmiAdj - 23) * 1;

    // ── Body fat — THE dominant factor, thresholds slide with age ──
    const bfT = this._getBodyFatThresholds(isMale, realAge);
    const youthFactor = 1 + Math.max(0, 35 - realAge) * 0.03;

    if (bf <= bfT.excellent) {
      score += Math.min((bfT.excellent - bf) * 0.5, 2);
    } else if (bf <= bfT.good) {
      score -= (bf - bfT.excellent) * 2.5 * youthFactor;
    } else if (bf <= bfT.avg) {
      score -= (bfT.good - bfT.excellent) * 2.5 * youthFactor + (bf - bfT.good) * 4 * youthFactor;
    } else if (bf <= bfT.high) {
      score -= (bfT.good - bfT.excellent) * 2.5 * youthFactor + (bfT.avg - bfT.good) * 4 * youthFactor + (bf - bfT.avg) * 3.5 * youthFactor;
    } else {
      const base = (bfT.good - bfT.excellent) * 2.5 * youthFactor + (bfT.avg - bfT.good) * 4 * youthFactor + (bfT.high - bfT.avg) * 3.5 * youthFactor;
      score -= base + (bf - bfT.high) * 2.5;
    }

    // Dangerously low BF
    const bfDangerLow = isMale ? 5 : 13;
    if (bf < bfDangerLow) score -= (bfDangerLow - bf) * 4;

    // ── Muscle — age-adjusted ideal ──
    const idealMuscle = this._getIdealMuscleRate(isMale, realAge);
    if (muscleRate < idealMuscle - 8) score -= 6 + (idealMuscle - 8 - muscleRate) * 1.5;
    else if (muscleRate < idealMuscle - 3) score -= (idealMuscle - 3 - muscleRate) * 1;
    else if (muscleRate < idealMuscle) score -= (idealMuscle - muscleRate) * 0.3;

    // ── Hydration — age-adjusted ideal ──
    const idealWater = this._getIdealBodyWater(isMale, realAge);
    if (bodyWater < idealWater - 8) score -= 4 + (idealWater - 8 - bodyWater);
    else if (bodyWater < idealWater) score -= (idealWater - bodyWater) * 0.4;

    // ── Visceral fat (already partly reflected in BF/BMI — softer penalty) ──
    if (visceralFat > 14) score -= 6 + (visceralFat - 14) * 1.2;
    else if (visceralFat > 9) score -= 1.5 + (visceralFat - 9) * 0.9;
    else if (visceralFat > 5) score -= (visceralFat - 5) * 0.25;

    // ── Body age vs real age (capped to avoid stacking with BF/BMI/visceral) ──
    let bodyAgePenalty = 0;
    if (bodyAge > realAge + 8) bodyAgePenalty = 5 + (bodyAge - realAge - 8) * 0.8;
    else if (bodyAge > realAge + 3) bodyAgePenalty = 1.5 + (bodyAge - realAge - 3) * 0.7;
    else if (bodyAge > realAge) bodyAgePenalty = (bodyAge - realAge) * 0.5;
    else if (bodyAge < realAge - 5) score += Math.min((realAge - bodyAge - 5) * 0.3, 2);
    score -= Math.min(bodyAgePenalty, 10);

    return Math.max(5, Math.min(100, Math.round(score)));
  }

  // ── Utils ──
  _round1(n) { return Math.round(n * 10) / 10; }
}

export default new BodyCompositionService();
