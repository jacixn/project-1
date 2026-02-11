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
    const bodyAge = this._calcBodyAge(isMale, age, bmi, bf, muscleRate, bodyWaterPercent);

    // ── TDEE ──
    const activityMultipliers = {
      sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, veryActive: 1.9,
    };
    const tdee = Math.round(bmr * (activityMultipliers[activityLevel] || 1.55));

    return {
      // Basic
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
      healthScore: this._calcHealthScore(isMale, bmi, bf, muscleRate, bodyWaterPercent, visceralFat, bodyAge, age),

      // Ratings / status
      bmiStatus: this._bmiStatus(bmi),
      bodyFatStatus: this._bodyFatStatus(isMale, bf),
      visceralFatStatus: this._visceralFatStatus(visceralFat),
      muscleStatus: this._muscleStatus(isMale, muscleRate),
      bodyWaterStatus: this._bodyWaterStatus(isMale, bodyWaterPercent),
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

  _calcBodyAge(isMale, chronologicalAge, bmi, bf, muscleRate, bodyWater) {
    // Deviation model: compare metrics to "ideal" ranges, adjust age up/down
    let deviation = 0;

    // BMI offset (ideal 21-23)
    const idealBMI = isMale ? 22.5 : 21.5;
    deviation += (bmi - idealBMI) * 0.6;

    // Body fat offset (ideal male ~15%, female ~23%)
    const idealBF = isMale ? 15 : 23;
    deviation += (bf - idealBF) * 0.3;

    // Muscle rate bonus (higher = younger)
    const idealMuscle = isMale ? 38 : 28;
    deviation -= (muscleRate - idealMuscle) * 0.3;

    // Hydration bonus
    const idealWater = isMale ? 60 : 55;
    deviation -= (bodyWater - idealWater) * 0.15;

    return Math.max(18, Math.min(80, Math.round(chronologicalAge + deviation)));
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

  _bodyFatStatus(isMale, bf) {
    const ranges = isMale
      ? [{ max: 6, label: 'Essential', color: '#3B82F6' }, { max: 14, label: 'Athletic', color: '#10B981' }, { max: 18, label: 'Fitness', color: '#10B981' }, { max: 25, label: 'Average', color: '#F59E0B' }]
      : [{ max: 14, label: 'Essential', color: '#3B82F6' }, { max: 21, label: 'Athletic', color: '#10B981' }, { max: 25, label: 'Fitness', color: '#10B981' }, { max: 32, label: 'Average', color: '#F59E0B' }];
    const match = ranges.find(r => bf < r.max);
    return match || { label: 'Above Average', color: '#EF4444' };
  }

  _visceralFatStatus(vf) {
    if (vf <= 9) return { label: 'Healthy', color: '#10B981' };
    if (vf <= 14) return { label: 'Elevated', color: '#F59E0B' };
    return { label: 'High', color: '#EF4444' };
  }

  _muscleStatus(isMale, rate) {
    // Based on real skeletal muscle % standards
    if (isMale) {
      if (rate >= 44) return { label: 'Very High', color: '#10B981' };
      if (rate >= 40) return { label: 'High', color: '#10B981' };
      if (rate >= 33) return { label: 'Normal', color: '#3B82F6' };
      return { label: 'Below Average', color: '#F59E0B' };
    } else {
      if (rate >= 36) return { label: 'Very High', color: '#10B981' };
      if (rate >= 31) return { label: 'High', color: '#10B981' };
      if (rate >= 24) return { label: 'Normal', color: '#3B82F6' };
      return { label: 'Below Average', color: '#F59E0B' };
    }
  }

  _bodyWaterStatus(isMale, pct) {
    const threshold = isMale ? 50 : 45;
    if (pct >= threshold + 10) return { label: 'Well Hydrated', color: '#10B981' };
    if (pct >= threshold) return { label: 'Normal', color: '#3B82F6' };
    return { label: 'Low', color: '#F59E0B' };
  }

  // ────────────────────────────────────────
  //  HEALTH SCORE (0-100) — Strict & honest
  // ────────────────────────────────────────

  _calcHealthScore(isMale, bmi, bf, muscleRate, bodyWater, visceralFat, bodyAge, realAge) {
    let score = 100;

    // ── BMI penalty (ideal 19–24.9) ──
    if (bmi < 16) score -= 20;
    else if (bmi < 18.5) score -= (18.5 - bmi) * 5;
    else if (bmi >= 35) score -= 20 + (bmi - 35) * 3;
    else if (bmi >= 30) score -= 12 + (bmi - 30) * 3;
    else if (bmi >= 25) score -= (bmi - 25) * 2.5;

    // ── Body fat — the biggest factor, no free buffer ──
    // Ideal ranges: Male 12–18%, Female 20–25%
    const idealBFLow = isMale ? 12 : 20;
    const idealBFHigh = isMale ? 18 : 25;

    if (bf > idealBFHigh) {
      const excess = bf - idealBFHigh;
      // Progressive penalty: steeper the further you are
      score -= excess * 3.5;
      if (excess > 5) score -= (excess - 5) * 2;   // extra steep 5%+ over
      if (excess > 12) score -= (excess - 12) * 2;  // even steeper 12%+ over
    } else if (bf < idealBFLow) {
      // Too lean can be unhealthy
      const deficit = idealBFLow - bf;
      score -= deficit * 2;
      if (deficit > 5) score -= (deficit - 5) * 3;  // dangerously low
    }
    // Within ideal range: no penalty (reward for being in range)

    // ── Muscle rate (skeletal muscle %) — modest influence ──
    // Ideal: Male ~38%, Female ~28% (midpoint of normal-high range)
    const idealMuscle = isMale ? 38 : 28;
    if (muscleRate < idealMuscle - 5) {
      score -= (idealMuscle - 5 - muscleRate) * 2;
    } else if (muscleRate < idealMuscle) {
      score -= (idealMuscle - muscleRate) * 1;
    } else {
      // Good muscle: small bonus only (should NOT offset bad body fat)
      score += Math.min((muscleRate - idealMuscle) * 0.25, 3);
    }

    // ── Hydration ──
    const idealWater = isMale ? 55 : 50;
    if (bodyWater < idealWater - 5) score -= (idealWater - 5 - bodyWater) * 1.5;
    else if (bodyWater < idealWater) score -= (idealWater - bodyWater) * 0.5;

    // ── Visceral fat (1-30 scale) ──
    if (visceralFat > 14) score -= 8 + (visceralFat - 14) * 2;
    else if (visceralFat > 9) score -= (visceralFat - 9) * 1.5;

    // ── Body age vs chronological age ──
    if (bodyAge > realAge + 5) score -= 5 + (bodyAge - realAge - 5) * 2;
    else if (bodyAge > realAge) score -= (bodyAge - realAge) * 1.5;
    else if (bodyAge < realAge) score += Math.min((realAge - bodyAge) * 0.5, 3);

    return Math.max(10, Math.min(100, Math.round(score)));
  }

  // ── Utils ──
  _round1(n) { return Math.round(n * 10) / 10; }
}

export default new BodyCompositionService();
