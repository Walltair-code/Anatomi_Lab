export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type AnatomyStructure = {
  id: string;
  meshName: string;
  swedishName: string;
  latinName: string;
  description: string;
  category: 'skeleton';
  difficulty: Difficulty;
  position: [number, number, number];
  size: [number, number, number];
  kind: 'bone' | 'sphere' | 'joint';
  rotation?: [number, number, number];
};

export const skeletonStructures: AnatomyStructure[] = [
  { id: 'skull', meshName: 'FMA4948_skull', swedishName: 'Skalle', latinName: 'Cranium', description: 'Skyddar hjärnan och formar ansiktets skelett.', category: 'skeleton', difficulty: 'beginner', position: [0, 4.6, 0], size: [0.9, 1.05, 0.85], kind: 'sphere' },
  { id: 'clavicle', meshName: 'FMA13478_clavicle', swedishName: 'Nyckelben', latinName: 'Clavicula', description: 'Förbinder bröstbenet med skulderbladet.', category: 'skeleton', difficulty: 'beginner', position: [0, 3.55, 0], size: [1.2, 0.13, 0.13], kind: 'bone', rotation: [0, 0, 0] },
  { id: 'scapula', meshName: 'FMA11300_scapula', swedishName: 'Skulderblad', latinName: 'Scapula', description: 'Platt ben som bildar axelleden tillsammans med överarmsbenet.', category: 'skeleton', difficulty: 'intermediate', position: [-0.75, 3.35, -0.08], size: [0.5, 0.75, 0.12], kind: 'bone', rotation: [0.2, 0, -0.35] },
  { id: 'sternum', meshName: 'FMA7485_sternum', swedishName: 'Bröstben', latinName: 'Sternum', description: 'Platt ben mitt på bröstkorgen där revbenen fäster.', category: 'skeleton', difficulty: 'beginner', position: [0, 3.05, 0.28], size: [0.28, 1.15, 0.16], kind: 'bone' },
  { id: 'ribs', meshName: 'FMA7562_ribs', swedishName: 'Revben', latinName: 'Costae', description: 'Skyddar hjärta och lungor tillsammans med bröstbenet.', category: 'skeleton', difficulty: 'beginner', position: [0, 3.05, 0], size: [1.15, 1.25, 0.2], kind: 'bone' },
  { id: 'humerus', meshName: 'FMA13303_humerus', swedishName: 'Överarmsben', latinName: 'Humerus', description: 'Långt rörben mellan skulderbladet och armbågen.', category: 'skeleton', difficulty: 'beginner', position: [-1.25, 2.7, 0], size: [0.23, 1.45, 0.23], kind: 'bone', rotation: [0, 0, -0.12] },
  { id: 'ulna', meshName: 'FMA23466_ulna', swedishName: 'Armbågsben', latinName: 'Ulna', description: 'Underarmens mediala ben på lillfingersidan.', category: 'skeleton', difficulty: 'intermediate', position: [-1.42, 1.42, 0], size: [0.15, 1.35, 0.15], kind: 'bone', rotation: [0, 0, 0.06] },
  { id: 'radius', meshName: 'FMA23468_radius', swedishName: 'Strålben', latinName: 'Radius', description: 'Underarmens laterala ben på tumsidan.', category: 'skeleton', difficulty: 'intermediate', position: [-1.08, 1.42, 0.04], size: [0.15, 1.35, 0.15], kind: 'bone', rotation: [0, 0, -0.04] },
  { id: 'pelvis', meshName: 'FMA9578_pelvis', swedishName: 'Bäcken', latinName: 'Pelvis', description: 'Bäckenringen bär upp ryggraden och skyddar bäckenorganen.', category: 'skeleton', difficulty: 'beginner', position: [0, 1.42, 0], size: [1.15, 0.75, 0.42], kind: 'bone' },
  { id: 'femur', meshName: 'FMA24480_femur', swedishName: 'Lårben', latinName: 'Femur', description: 'Kroppens längsta och starkaste ben.', category: 'skeleton', difficulty: 'beginner', position: [-0.48, 0.25, 0], size: [0.27, 1.85, 0.27], kind: 'bone', rotation: [0, 0, -0.03] },
  { id: 'patella', meshName: 'FMA24485_patella', swedishName: 'Knäskål', latinName: 'Patella', description: 'Sesamben som skyddar knäleden och förbättrar hävstången.', category: 'skeleton', difficulty: 'intermediate', position: [-0.42, -0.78, 0.22], size: [0.25, 0.28, 0.14], kind: 'sphere' },
  { id: 'tibia', meshName: 'FMA24487_tibia', swedishName: 'Skenben', latinName: 'Tibia', description: 'Underbenets mediala och bärande ben.', category: 'skeleton', difficulty: 'beginner', position: [-0.48, -1.7, 0], size: [0.2, 1.8, 0.2], kind: 'bone', rotation: [0, 0, 0.02] },
  { id: 'fibula', meshName: 'FMA24490_fibula', swedishName: 'Vadben', latinName: 'Fibula', description: 'Smalare lateralt ben i underbenet.', category: 'skeleton', difficulty: 'intermediate', position: [-0.15, -1.7, 0.02], size: [0.13, 1.75, 0.13], kind: 'bone', rotation: [0, 0, -0.03] },
  { id: 'tarsals', meshName: 'FMA24494_tarsals', swedishName: 'Fotrotsben', latinName: 'Ossa tarsi', description: 'De sju ben som bildar fotroten.', category: 'skeleton', difficulty: 'advanced', position: [-0.34, -2.72, 0.04], size: [0.55, 0.35, 0.3], kind: 'bone', rotation: [0, 0, 0.05] },
  { id: 'vertebral-column', meshName: 'FMA13478_vertebral_column', swedishName: 'Ryggrad', latinName: 'Columna vertebralis', description: 'Består av kotor och skyddar ryggmärgen.', category: 'skeleton', difficulty: 'beginner', position: [0, 2.4, -0.18], size: [0.28, 2.2, 0.25], kind: 'bone' },
];

export const difficultyLabel: Record<Difficulty, string> = {
  beginner: 'Nybörjare',
  intermediate: 'Medel',
  advanced: 'Avancerad',
};
