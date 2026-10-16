import type { ProfileStep } from '@marchmaker/shared';

export type FieldKind = 'text' | 'number' | 'select' | 'chips' | 'boolean' | 'textarea' | 'suggest';

export interface FieldDef {
  name: string;
  kind: FieldKind;
  /** Option values; labels come from i18n `p.o.<name>.<value>`. */
  options?: readonly string[];
  /** Free-text suggestions for `suggest` fields. */
  suggestions?: readonly string[];
  /** Whether a "why we ask" tooltip exists in i18n `p.why.<name>`. */
  why?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
  autoComplete?: string;
  voice?: boolean;
  maxLength?: number;
}

const RELIGIONS = ['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Buddhist', 'Parsi', 'Jewish', 'Spiritual', 'No religion'];
const LANGUAGES = [
  'Hindi',
  'English',
  'Marathi',
  'Gujarati',
  'Bengali',
  'Tamil',
  'Telugu',
  'Kannada',
  'Malayalam',
  'Punjabi',
  'Odia',
  'Urdu',
  'Assamese',
];

/** Mirrors the shared Zod schemas; the server remains the source of truth for validation. */
export const STEP_FIELDS: Record<Exclude<ProfileStep, 'photos'>, FieldDef[]> = {
  basics: [
    { name: 'firstName', kind: 'text', required: true, autoComplete: 'given-name' },
    { name: 'lastName', kind: 'text', autoComplete: 'family-name' },
    { name: 'heightCm', kind: 'number', required: true, min: 120, max: 230, why: true },
    {
      name: 'maritalStatus',
      kind: 'chips',
      required: true,
      why: true,
      options: ['never_married', 'divorced', 'widowed', 'annulled'],
    },
    { name: 'hasChildren', kind: 'boolean' },
    { name: 'healthNotes', kind: 'textarea', maxLength: 300, why: true },
  ],
  background: [
    { name: 'religion', kind: 'suggest', required: true, suggestions: RELIGIONS, why: true },
    { name: 'community', kind: 'text' },
    { name: 'motherTongue', kind: 'suggest', required: true, suggestions: LANGUAGES },
    { name: 'city', kind: 'text', required: true, why: true, autoComplete: 'address-level2' },
    { name: 'state', kind: 'text', required: true, autoComplete: 'address-level1' },
    { name: 'country', kind: 'text', autoComplete: 'country-name' },
    { name: 'citizenship', kind: 'text' },
  ],
  education_career: [
    {
      name: 'highestEducation',
      kind: 'select',
      required: true,
      options: ['High_school', 'Diploma', 'Bachelors', 'Masters', 'Doctorate', 'Professional'],
    },
    { name: 'institution', kind: 'text' },
    { name: 'profession', kind: 'text', required: true },
    { name: 'employer', kind: 'text' },
    {
      name: 'incomeBand',
      kind: 'select',
      why: true,
      options: ['below_5', '5_10', '10_15', '15_25', '25_50', '50_100', 'above_100', 'private'],
    },
  ],
  family: [
    { name: 'familyType', kind: 'chips', required: true, options: ['nuclear', 'joint', 'other'] },
    { name: 'fatherOccupation', kind: 'text' },
    { name: 'motherOccupation', kind: 'text' },
    { name: 'siblings', kind: 'number', min: 0, max: 15 },
    { name: 'familyValues', kind: 'chips', options: ['traditional', 'moderate', 'liberal'] },
  ],
  lifestyle: [
    { name: 'diet', kind: 'chips', required: true, options: ['vegetarian', 'eggetarian', 'non_vegetarian', 'vegan', 'jain'] },
    { name: 'smoking', kind: 'chips', required: true, options: ['never', 'occasionally', 'regularly'] },
    { name: 'drinking', kind: 'chips', required: true, options: ['never', 'occasionally', 'regularly'] },
    { name: 'fitness', kind: 'chips', options: ['rarely', 'sometimes', 'often', 'daily'] },
  ],
  values: [
    {
      name: 'marriageTimeline',
      kind: 'chips',
      required: true,
      why: true,
      options: ['within_1_year', '1_2_years', '2_3_years', 'flexible'],
    },
    { name: 'wantsKids', kind: 'chips', required: true, why: true, options: ['yes', 'no', 'open'] },
    { name: 'settleCity', kind: 'text' },
    { name: 'livingWithFamily', kind: 'chips', required: true, why: true, options: ['yes', 'no', 'open'] },
    { name: 'careerAfterMarriage', kind: 'chips', options: ['continue', 'pause', 'flexible'] },
  ],
  about: [{ name: 'bio', kind: 'textarea', required: true, why: true, voice: true, maxLength: 1000 }],
};

export const PROMPT_IDS = ['perfect_sunday', 'looking_for', 'grew_up'] as const;
