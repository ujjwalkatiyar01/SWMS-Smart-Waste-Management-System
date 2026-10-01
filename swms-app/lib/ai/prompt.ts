export const WASTE_PROMPT = `Classify only waste visibly present in this photograph for a demo waste-management app.
Return one JSON object with keys category, confidence, hazard, visible_items, reason.
category must be wet, dry, biomedical, hazardous, e_waste, or mixed_uncertain.
confidence must be high, medium, or low. Prefer mixed_uncertain and low when unsure or when categories are mixed.
Set hazard true for visible syringes, needles, blood-stained material, medicines, chemicals, batteries, broken glass, or unknown containers.
visible_items is a short list of objects actually visible; reason is one short sentence.
Do not guess location, identity, people, or anything outside the image. Respond with JSON only.`;
