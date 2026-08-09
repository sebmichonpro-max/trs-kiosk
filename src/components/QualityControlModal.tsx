'use client';

import { useState, useRef, useMemo } from 'react';
import { X, Microscope, Check, Printer } from 'lucide-react';
import NumPad from './NumPad';
import { supabase, ORGANIZATION_ID } from '@/lib/supabase';

interface QualityControlModalProps {
  sessionId: string;
  lineId: string;
  lineName: string;
  productId: string;
  productName: string;
  theoreticalWeight: number | null;
  tolerancePercent: number | null;
  o2ThresholdWarning: number | null;
  o2ThresholdCritical: number | null;
  unitLabel: string;
  onClose: () => void;
}

export default function QualityControlModal({
  sessionId,
  lineId,
  lineName,
  productId,
  productName,
  theoreticalWeight,
  tolerancePercent,
  o2ThresholdWarning,
  o2ThresholdCritical,
  onClose,
}: QualityControlModalProps) {
  const [step, setStep] = useState<'o2' | 'weight' | 'comment' | 'done'>('o2');
  const [o2Value, setO2Value] = useState('');
  const [weights, setWeights] = useState<string[]>(Array(20).fill(''));
  const [activeWeightIdx, setActiveWeightIdx] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedControlId, setSavedControlId] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const thresholdWarn = o2ThresholdWarning ?? 1.5;
  const thresholdCrit = o2ThresholdCritical ?? 2.5;
  const tolerance = tolerancePercent ?? 5.0;
  const [manualWeight, setManualWeight] = useState('');
  const theoWeight = theoreticalWeight ?? (parseFloat(manualWeight) || 0);

  const o2Num = parseFloat(o2Value) || 0;
  const o2Status = o2Value === '' ? null : o2Num > thresholdCrit ? 'critical' : o2Num > thresholdWarn ? 'warning' : 'good';

  const weightStats = useMemo(() => {
    const nums = weights.map((w) => parseFloat(w)).filter((w) => !isNaN(w) && w > 0);
    if (nums.length === 0) return null;
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const variance = nums.reduce((a, b) => a + (b - avg) ** 2, 0) / nums.length;
    const stdDev = Math.sqrt(variance);
    const tolMin = theoWeight * (1 - tolerance / 100);
    const tolMax = theoWeight * (1 + tolerance / 100);
    const outOfTolerance = theoWeight > 0 ? nums.filter((w) => w < tolMin || w > tolMax).length : 0;
    return { avg, min, max, stdDev, outOfTolerance, count: nums.length };
  }, [weights, theoWeight, tolerance]);

  function handleWeightChange(value: string) {
    const updated = [...weights];
    updated[activeWeightIdx] = value;
    setWeights(updated);
  }

  function confirmWeight() {
    if (activeWeightIdx < 19 && weights[activeWeightIdx]) {
      setActiveWeightIdx(activeWeightIdx + 1);
    }
  }

  function isWeightConforming(w: string): boolean | null {
    if (!w || theoWeight <= 0) return null;
    const num = parseFloat(w);
    if (isNaN(num)) return null;
    const tolMin = theoWeight * (1 - tolerance / 100);
    const tolMax = theoWeight * (1 + tolerance / 100);
    return num >= tolMin && num <= tolMax;
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);

    const controlType = o2Value && weightStats ? 'combined' : o2Value ? 'o2' : 'weight';

    const { data, error } = await supabase
      .from('quality_controls')
      .insert({
        organization_id: ORGANIZATION_ID,
        session_id: sessionId,
        line_id: lineId,
        product_id: productId,
        control_type: controlType,
        o2_level: o2Value ? o2Num : null,
        o2_conformity: o2Value ? o2Status === 'good' : null,
        weight_average: weightStats?.avg ?? null,
        weight_min: weightStats?.min ?? null,
        weight_max: weightStats?.max ?? null,
        weight_std_dev: weightStats?.stdDev ?? null,
        weight_out_of_tolerance: weightStats?.outOfTolerance ?? null,
        theoretical_weight: theoWeight || null,
        tolerance_percent: tolerance,
        comment: comment || null,
        controlled_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error || !data) { setSaving(false); return; }

    const validWeights = weights
      .map((w, i) => ({ position: i + 1, weight: parseFloat(w), is_conforming: isWeightConforming(w) ?? true }))
      .filter((w) => !isNaN(w.weight) && w.weight > 0);

    if (validWeights.length > 0) {
      await supabase.from('quality_control_weights').insert(
        validWeights.map((w) => ({ control_id: data.id, ...w }))
      );
    }

    setSavedControlId(data.id);
    setSaving(false);
    setStep('done');
  }

  function handlePrint() {
    if (!printRef.current) return;
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    printWin.document.write(`
      <!DOCTYPE html><html><head><title>Fiche Contrôle Qualité</title>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; padding: 20px; color: #1a1a1a; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        td, th { padding: 6px 10px; border: 1px solid #ddd; text-align: left; }
        th { background: #f5f5f5; font-weight: 600; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #2d5a3d; padding-bottom: 10px; }
        .header h1 { color: #2d5a3d; margin: 0; font-size: 18px; }
        .section { margin: 15px 0; }
        .section h2 { font-size: 14px; color: #2d5a3d; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
        .good { color: #22c55e; } .bad { color: #ef4444; }
        .sig { margin-top: 30px; display: flex; gap: 40px; }
        .sig div { flex: 1; border-top: 1px solid #999; padding-top: 5px; }
        @media print { body { padding: 0; } }
      </style></head><body>${printRef.current.innerHTML}</body></html>
    `);
    printWin.document.close();
    printWin.print();
  }

  const now = new Date();
  const tolMin = theoWeight > 0 ? theoWeight * (1 - tolerance / 100) : 0;
  const tolMax = theoWeight > 0 ? theoWeight * (1 + tolerance / 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2">
      <div className="w-full max-w-3xl max-h-[95vh] overflow-y-auto rounded-[20px] bg-bg-card border border-border-card">
        <div className="flex items-center justify-between p-5 border-b border-border-card">
          <div className="flex items-center gap-2">
            <Microscope className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-text">Contrôle qualité</h2>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-xl bg-bg-main border border-border-card">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <div className="flex border-b border-border-card">
          {(['o2', 'weight', 'comment'] as const).map((s) => (
            <button
              key={s}
              onClick={() => { if (step !== 'done') setStep(s); }}
              className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${step === s ? 'text-primary border-b-2 border-primary' : 'text-text-secondary'}`}
            >
              {s === 'o2' ? 'Taux O₂' : s === 'weight' ? 'Pesée (20)' : 'Commentaire'}
            </button>
          ))}
        </div>

        <div className="p-5">
          {step === 'o2' && (
            <div>
              <p className="text-sm text-text-secondary mb-3">
                Seuils : vert {'<'} {thresholdWarn}%, orange {thresholdWarn}-{thresholdCrit}%, rouge {'>'} {thresholdCrit}%
              </p>
              <NumPad value={o2Value} onChange={setO2Value} label="Taux O₂ (%)" unit="%" />
              {o2Status && (
                <div className={`mt-3 px-4 py-3 rounded-xl text-sm font-semibold text-center ${
                  o2Status === 'good' ? 'bg-success/10 text-success' : o2Status === 'warning' ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'
                }`}>
                  {o2Status === 'good' ? '✅ Conforme' : o2Status === 'warning' ? '⚠️ Attention' : '❌ Non conforme'}
                  {' — '}{o2Num.toFixed(2)}%
                </div>
              )}
              <button onClick={() => setStep('weight')} className="w-full mt-4 h-14 rounded-2xl bg-primary text-white font-semibold active:scale-[0.97] transition-all hover:bg-primary-hover">
                Suivant → Pesée
              </button>
            </div>
          )}

          {step === 'weight' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-text">Pesée — 20 barquettes</p>
                {theoWeight > 0 && (
                  <p className="text-xs text-text-secondary">
                    Cible : {theoWeight}g (±{tolerance}%)
                  </p>
                )}
              </div>

              {!theoreticalWeight && (
                <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-warning/10 border border-warning/20">
                  <label className="text-xs font-medium text-text-secondary whitespace-nowrap">Poids cible (g) :</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={manualWeight}
                    onChange={(e) => setManualWeight(e.target.value)}
                    placeholder="Ex: 250"
                    className="flex-1 h-10 px-3 rounded-xl bg-bg-main border border-border-card text-text text-sm font-bold text-center focus:outline-none focus:border-primary"
                  />
                </div>
              )}

              <div className="grid grid-cols-5 gap-1.5 mb-4">
                {weights.map((w, i) => {
                  const conf = isWeightConforming(w);
                  return (
                    <button
                      key={i}
                      onClick={() => setActiveWeightIdx(i)}
                      className={`flex flex-col items-center py-2 rounded-xl text-xs border transition-all active:scale-95 ${
                        i === activeWeightIdx
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                          : conf === true ? 'border-success/40 bg-success/5'
                          : conf === false ? 'border-danger/40 bg-danger/5'
                          : 'border-border-card bg-bg-main'
                      }`}
                    >
                      <span className="text-text-secondary font-medium">{i + 1}</span>
                      <span className={`text-sm font-bold ${conf === false ? 'text-danger' : conf === true ? 'text-success' : 'text-text'}`}>
                        {w || '—'}
                      </span>
                    </button>
                  );
                })}
              </div>

              <NumPad
                value={weights[activeWeightIdx]}
                onChange={handleWeightChange}
                label={`Barquette ${activeWeightIdx + 1}`}
                unit="g"
              />
              <button
                onClick={confirmWeight}
                disabled={!weights[activeWeightIdx]}
                className="w-full mt-2 h-12 rounded-2xl bg-bg-main border border-border-card text-text font-medium active:scale-[0.97] disabled:opacity-40"
              >
                {activeWeightIdx < 19 ? `Suivant → Barquette ${activeWeightIdx + 2}` : 'Terminé'}
              </button>

              {weightStats && (
                <div className="grid grid-cols-4 gap-2 mt-4">
                  <div className="text-center p-2 rounded-xl bg-bg-main border border-border-card">
                    <p className="text-lg font-bold text-text">{weightStats.avg.toFixed(1)}g</p>
                    <p className="text-[10px] text-text-secondary">Moyenne</p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-bg-main border border-border-card">
                    <p className="text-sm font-bold text-text">{weightStats.min.toFixed(1)} / {weightStats.max.toFixed(1)}</p>
                    <p className="text-[10px] text-text-secondary">Min / Max</p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-bg-main border border-border-card">
                    <p className="text-lg font-bold text-text">{weightStats.stdDev.toFixed(1)}g</p>
                    <p className="text-[10px] text-text-secondary">Écart-type</p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-bg-main border border-border-card">
                    <p className={`text-lg font-bold ${weightStats.outOfTolerance > 0 ? 'text-danger' : 'text-success'}`}>
                      {weightStats.outOfTolerance}/{weightStats.count}
                    </p>
                    <p className="text-[10px] text-text-secondary">Hors tol.</p>
                  </div>
                </div>
              )}

              <button onClick={() => setStep('comment')} className="w-full mt-4 h-14 rounded-2xl bg-primary text-white font-semibold active:scale-[0.97] transition-all hover:bg-primary-hover">
                Suivant → Commentaire
              </button>
            </div>
          )}

          {step === 'comment' && (
            <div>
              <label className="text-[13px] font-medium text-text-secondary mb-2 block">
                Commentaire (optionnel)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ex: RAS"
                rows={3}
                className="w-full px-4 py-3 rounded-2xl bg-bg-main border border-border-card text-text placeholder:text-text-secondary/50 resize-none text-sm focus:outline-none focus:border-primary/50 mb-4"
              />

              <div className="space-y-2 mb-4">
                {o2Value && (
                  <div className="flex justify-between px-4 py-2 rounded-xl bg-bg-main border border-border-card text-sm">
                    <span className="text-text-secondary">Taux O₂</span>
                    <span className={`font-semibold ${o2Status === 'good' ? 'text-success' : o2Status === 'warning' ? 'text-warning' : 'text-danger'}`}>
                      {o2Num.toFixed(2)}%
                    </span>
                  </div>
                )}
                {weightStats && (
                  <div className="flex justify-between px-4 py-2 rounded-xl bg-bg-main border border-border-card text-sm">
                    <span className="text-text-secondary">Pesées</span>
                    <span className="font-semibold text-text">
                      {weightStats.count}/20 — moy. {weightStats.avg.toFixed(1)}g — {weightStats.outOfTolerance} hors tol.
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={handleSave}
                disabled={saving || (!o2Value && !weightStats)}
                className="w-full h-14 rounded-2xl bg-success text-white font-semibold text-[17px] active:scale-[0.97] transition-all flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Check className="w-5 h-5" />
                Valider le contrôle
              </button>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-success" />
              </div>
              <h3 className="text-lg font-bold text-text mb-2">Contrôle enregistré</h3>
              <button
                onClick={handlePrint}
                className="mx-auto h-14 px-8 rounded-2xl bg-primary text-white font-semibold active:scale-[0.97] transition-all flex items-center justify-center gap-2 mt-4"
              >
                <Printer className="w-5 h-5" />
                Imprimer la fiche
              </button>
              <button onClick={onClose} className="mt-3 text-sm text-text-secondary hover:text-text py-2">
                Fermer
              </button>
            </div>
          )}
        </div>

        {/* Hidden printable report */}
        <div ref={printRef} style={{ display: 'none' }}>
          <div className="header">
            <h1>FICHE DE CONTRÔLE QUALITÉ</h1>
            <p>Date : {now.toLocaleDateString('fr-FR')} &nbsp;&nbsp; Heure : {now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
            <p>Ligne : {lineName} &nbsp;&nbsp; Produit : {productName}</p>
          </div>
          {o2Value && (
            <div className="section">
              <h2>CONTRÔLE ATMOSPHÈRE</h2>
              <p>Taux O₂ : {o2Num.toFixed(2)}% &nbsp;&nbsp;{o2Status === 'good' ? '✅ Conforme' : '❌ Non conforme'}</p>
            </div>
          )}
          {weightStats && (
            <div className="section">
              <h2>CONTRÔLE PESÉE (20 barquettes)</h2>
              {theoWeight > 0 && <p>Poids théorique : {theoWeight}g (±{tolerance}%)</p>}
              <table>
                <tbody>
                  {Array.from({ length: 10 }, (_, i) => (
                    <tr key={i}>
                      <td>{i + 1}. {weights[i] ? `${weights[i]}g` : '—'} {weights[i] ? (isWeightConforming(weights[i]) ? '✅' : '❌') : ''}</td>
                      <td>{i + 11}. {weights[i + 10] ? `${weights[i + 10]}g` : '—'} {weights[i + 10] ? (isWeightConforming(weights[i + 10]) ? '✅' : '❌') : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>Moyenne : {weightStats.avg.toFixed(1)}g &nbsp;&nbsp; Min : {weightStats.min.toFixed(1)}g &nbsp;&nbsp; Max : {weightStats.max.toFixed(1)}g</p>
              <p>Écart-type : {weightStats.stdDev.toFixed(1)}g &nbsp;&nbsp; Hors tolérance : {weightStats.outOfTolerance}/{weightStats.count}</p>
            </div>
          )}
          {comment && (
            <div className="section">
              <h2>Commentaire</h2>
              <p>{comment}</p>
            </div>
          )}
          <div className="sig">
            <div>Contrôleur : ________________</div>
            <div>Signature : ________________</div>
          </div>
        </div>
      </div>
    </div>
  );
}
