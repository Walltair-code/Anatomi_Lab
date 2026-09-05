import { Canvas, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, BookOpen, Check, ChevronRight, CircleHelp, Crosshair, Eye, EyeOff, Layers3, RotateCcw, SkipForward, Sparkles, Target, TimerReset, Trophy, X } from 'lucide-react';
import { difficultyLabel, skeletonStructures, type AnatomyStructure, type Difficulty } from './data/skeleton';

const feedbackColors = { correct: '#1d9b78', wrong: '#e06b68' };

type Mode = 'quiz' | 'explore';
type Feedback = 'correct' | 'wrong' | null;
type ViewAngle = 'front' | 'left' | 'right' | 'top' | 'back';

const stlFiles = import.meta.glob('/Skeleton/**/*.stl', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const stlEntries = Object.entries(stlFiles).sort(([left], [right]) => left.localeCompare(right));

function labelFromFile(path: string) {
  return path.split('/').pop()?.replace(/\.stl$/i, '') ?? 'Skelettdel';
}

function translateStlName(label: string) {
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const ordinal = ['första', 'andra', 'tredje', 'fjärde', 'femte', 'sjätte', 'sjunde', 'åttonde', 'nionde', 'tionde', 'elfte', 'tolvte'];
  const side = (value?: string) => value === 'L' ? { swedish: 'vänster', latin: 'sinister' } : { swedish: 'höger', latin: 'dexter' };
  const sideSuffix = (value?: string) => value ? { swedish: ` ${side(value).swedish}`, latin: `, ${side(value).latin}` } : { swedish: '', latin: '' };
  const phalanx = label.match(/^(Distal|Intermediate|Proximal)_Phalange_(\d)([LR])(?:_\d+)*$/);
  if (phalanx) {
    const section = phalanx[1] === 'Distal' ? ['distala falangen', 'phalanx distalis'] : phalanx[1] === 'Intermediate' ? ['mellanfalangen', 'phalanx media'] : ['proximala falangen', 'phalanx proximalis'];
    const suffix = sideSuffix(phalanx[3]);
    return { swedishName: `${section[0]} ${roman[Number(phalanx[2]) - 1]}${suffix.swedish}`, latinName: `${section[1]} ${roman[Number(phalanx[2]) - 1]}${suffix.latin}` };
  }
  const vertebra = label.match(/^(Cervical|Thoracic|Lumbar)_(\d+)$/);
  if (vertebra) {
    const index = Number(vertebra[2]) - 1;
    const names = vertebra[1] === 'Cervical' ? ['halskota', 'vertebra cervicalis'] : vertebra[1] === 'Thoracic' ? ['bröstkota', 'vertebra thoracica'] : ['ländkota', 'vertebra lumbalis'];
    return { swedishName: `${ordinal[index]} ${names[0]}`, latinName: `${names[1]} ${roman[index]}` };
  }
  const rib = label.match(/^R([LR])(\d+)$/);
  if (rib) return { swedishName: `${ordinal[Number(rib[2]) - 1]} revben ${side(rib[1]).swedish}`, latinName: `costa ${roman[Number(rib[2]) - 1]}, ${side(rib[1]).latin}` };
  const namedRib = label.match(/^R([LR])([1-9]|1[0-2])(?:_\d+)*$/);
  if (namedRib) return { swedishName: `${ordinal[Number(namedRib[2]) - 1]} revben ${side(namedRib[1]).swedish}`, latinName: `costa ${roman[Number(namedRib[2]) - 1]}, ${side(namedRib[1]).latin}` };
  const segment = label.match(/^Sacrum_(\d+)$/);
  if (segment) return { swedishName: `${ordinal[Number(segment[1]) - 1]} korsbenssegment`, latinName: `os sacrum ${roman[Number(segment[1]) - 1]}` };
  const coccyx = label.match(/^Coccygeal_(\d+)$/);
  if (coccyx) return { swedishName: `${ordinal[Number(coccyx[1]) - 1]} svanskota`, latinName: `vertebra coccygea ${roman[Number(coccyx[1]) - 1]}` };
  const ray = label.match(/^(Metacarpal|Metatarsal)_(\d)([LR])$/);
  if (ray) {
    const isHand = ray[1] === 'Metacarpal';
    const suffix = sideSuffix(ray[3]);
    return { swedishName: `${isHand ? 'mellanhandsben' : 'mellanfotsben'} ${roman[Number(ray[2]) - 1]}${suffix.swedish}`, latinName: `${isHand ? 'os metacarpale' : 'os metatarsale'} ${roman[Number(ray[2]) - 1]}${suffix.latin}` };
  }
  const names: Record<string, [string, string]> = {
    Skull: ['Skalle', 'cranium'], Skull_1: ['Skalle', 'cranium'], Mandible: ['Underkäke', 'mandibula'], Maxilla: ['Överkäke', 'maxilla'], Hyoid: ['Tungben', 'os hyoideum'],
    Calcaneus: ['Hälben', 'calcaneus'], Cuboid: ['Tärningsben', 'os cuboideum'], Navicular: ['Båtben', 'os naviculare'], Talus: ['Språngben', 'talus'],
    Medial_Cuneiform: ['Mediala kilbenet', 'os cuneiforme mediale'], Intermediate_Cuneiform: ['Mellersta kilbenet', 'os cuneiforme intermedium'], Lateral_Cuneiform: ['Laterala kilbenet', 'os cuneiforme laterale'],
    Capitate: ['Huvudben', 'os capitatum'], Hamate: ['Hakben', 'os hamatum'], Lunate: ['Månben', 'os lunatum'], Pisiform: ['Ärtben', 'os pisiforme'], Scaphoid: ['Båtben', 'os scaphoideum'], Trapezium: ['Stora månghörningsbenet', 'os trapezium'], Trapezoid: ['Lilla månghörningsbenet', 'os trapezoideum'], Triquetral: ['Trekantben', 'os triquetrum'],
    Clavicle: ['Nyckelben', 'clavicula'], Femur: ['Lårben', 'femur'], Fibula: ['Vadben', 'fibula'], Humerus: ['Överarmsben', 'humerus'], Patella: ['Knäskål', 'patella'], Radius: ['Strålben', 'radius'], Scapula: ['Skulderblad', 'scapula'], Tibia: ['Skenben', 'tibia'], Ulna: ['Armbågsben', 'ulna'],
    Left_Hip: ['Vänster höftben', 'os coxae sinister'], Right_Hip: ['Höger höftben', 'os coxae dexter'], Manubrium: ['Bröstbenshandtag', 'manubrium sterni'], Sternum: ['Bröstben', 'sternum'], Xiphoid: ['Svärdutskott', 'processus xiphoideus'],
  };
  const sided = label.match(/^(.+)_([LR])(?:_\d+)*$/);
  const base = sided?.[1] ?? label;
  const match = names[base] ?? names[label];
  if (match) {
    const suffix = sideSuffix(sided?.[2]);
    return { swedishName: `${match[0]}${suffix.swedish}`, latinName: `${match[1]}${suffix.latin}` };
  }
  return { swedishName: label, latinName: label };
}

function makePart(path: string): AnatomyStructure {
  const label = labelFromFile(path);
  const translated = translateStlName(label);
  const known = skeletonStructures.find((item) => translated.latinName.toLowerCase().startsWith(item.latinName.toLowerCase()));
  return {
    id: `stl-${path}`,
    meshName: label,
    swedishName: translated.swedishName,
    latinName: translated.latinName,
    description: known?.description ?? 'Separat ben i skelettassemblaget.',
    category: 'skeleton',
    difficulty: known?.difficulty ?? 'advanced',
    position: [0, 0, 0],
    size: [1, 1, 1],
    kind: 'bone',
  };
}

const stlParts = stlEntries.map(([path]) => ({ path, part: makePart(path) }));
const shuffleStructures = (structures: AnatomyStructure[]) => [...structures].sort(() => Math.random() - 0.5);
const assemblyScale = 5.05 / 1440.959877;
const assemblyCenter: [number, number, number] = [-0.006012, -115.477008, 650.000042];

function StlPartMesh({ url, entry, selectedId, feedback, revealId, onSelect }: { url: string; entry: { path: string; part: AnatomyStructure }; selectedId: string | null; feedback: Feedback; revealId: string | null; onSelect: (structure: AnatomyStructure) => void }) {
  const geometry = useLoader(STLLoader, url);
  const isChosen = selectedId === entry.part.id;
  const isCorrect = revealId === entry.part.id;
  const color = feedback === 'wrong' && isChosen ? feedbackColors.wrong : (feedback === 'wrong' && isCorrect) || (feedback === 'correct' && isChosen) ? feedbackColors.correct : isChosen ? '#1769aa' : '#f8fafc';
  return <mesh name={entry.part.meshName} geometry={geometry} onClick={(event) => { event.stopPropagation(); onSelect(entry.part); }}>
    <meshStandardMaterial color={color} roughness={0.7} metalness={0.02} />
  </mesh>;
}

function CameraRig({ view, resetToken, focusName, controlsRef }: { view: ViewAngle; resetToken: number; focusName: string | null; controlsRef: { current: any } }) {
  const { camera, scene } = useThree();
  useEffect(() => {
    const positions: Record<ViewAngle, [number, number, number]> = {
      front: [0, 0, 12], left: [-12, 0, 0], right: [12, 0, 0], top: [0, 12, 0], back: [0, 0, -12],
    };
    camera.position.set(...positions[view]);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    if (!focusName) return;
    const focusTimer = window.setTimeout(() => {
      const targetObject = scene.getObjectByName(focusName);
      if (!targetObject) return;
      const bounds = new THREE.Box3().setFromObject(targetObject);
      const target = bounds.getCenter(new THREE.Vector3());
      const sphere = bounds.getBoundingSphere(new THREE.Sphere());
      const direction = camera.position.clone().sub(target).normalize();
      camera.position.copy(target).add(direction.multiplyScalar(Math.max(sphere.radius * 2.8, 1.5)));
      camera.lookAt(target);
      controlsRef.current?.target.copy(target);
      controlsRef.current?.update();
    }, 1000);
    return () => window.clearTimeout(focusTimer);
  }, [camera, scene, view, resetToken, focusName, controlsRef]);
  return null;
}

function SkeletonMap({ selectedId, feedback, onSelect, revealId, view, resetToken, focusName }: { selectedId: string | null; feedback: Feedback; onSelect: (structure: AnatomyStructure) => void; revealId: string | null; view: ViewAngle; resetToken: number; focusName: string | null }) {
  const controlsRef = useRef<any>(null);
  return (
    <div className="stl-stage" role="group" aria-label="Interaktiv 3D-modell av skelettet">
      <Canvas camera={{ position: [0, 0, 12], fov: 34 }} dpr={[1, 1.25]}>
        <CameraRig view={view} resetToken={resetToken} focusName={focusName} controlsRef={controlsRef} />
        <color attach="background" args={['#1b2025']} />
        <ambientLight intensity={2.4} />
        <directionalLight position={[4, 5, 7]} intensity={2.8} color="#ffffff" />
        <directionalLight position={[-4, 2, 3]} intensity={1.1} color="#9dc9e8" />
        <group rotation={[-Math.PI / 2, 0, 0]} scale={assemblyScale} position={[-assemblyCenter[0] * assemblyScale, -assemblyCenter[2] * assemblyScale, assemblyCenter[1] * assemblyScale]}>
          {stlEntries.map(([path, url], index) => <Suspense key={path} fallback={null}><StlPartMesh url={url} entry={stlParts[index]} selectedId={selectedId} feedback={feedback} revealId={revealId} onSelect={onSelect} /></Suspense>)}
        </group>
        <OrbitControls ref={controlsRef} enablePan enableZoom minDistance={4} maxDistance={14} />
      </Canvas>
    </div>
  );
}

function App() {
  const [mode, setMode] = useState<Mode>('quiz');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [latinOnly, setLatinOnly] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [missed, setMissed] = useState<AnatomyStructure[]>([]);
  const [rematchQuestions, setRematchQuestions] = useState<AnatomyStructure[] | null>(null);
  const [score, setScore] = useState(0);
  const [explored, setExplored] = useState<AnatomyStructure | null>(null);
  const [seconds, setSeconds] = useState(42);
  const [roundDone, setRoundDone] = useState(false);
  const [view, setView] = useState<ViewAngle>('front');
  const [resetToken, setResetToken] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [questionSet, setQuestionSet] = useState<AnatomyStructure[]>(() => shuffleStructures(stlParts.map(({ part }) => part)));

  const questions = useMemo(() => rematchQuestions ?? questionSet, [questionSet, rematchQuestions]);
  const question = questions[questionIndex % questions.length];
  const selectedStructure = selectedId ? stlParts.find(({ part }) => part.id === selectedId)?.part : null;
  const progress = Math.min(((questionIndex + (roundDone ? 1 : 0)) / questions.length) * 100, 100);

  useEffect(() => {
    if (roundDone || mode !== 'quiz') return;
    const interval = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [mode, roundDone]);

  useEffect(() => {
    const best = Number(localStorage.getItem('anatomi-best-score') || 0);
    if (score > best) localStorage.setItem('anatomi-best-score', String(score));
  }, [score]);

  const selectStructure = (structure: AnatomyStructure) => {
    setSelectedId(structure.id);
    if (mode === 'explore') {
      setExplored(structure);
      return;
    }
    if (feedback) return;
    if (structure.id === question.id) {
      setFeedback('correct');
      setScore((value) => value + 1);
    } else {
      setFeedback('wrong');
      setMissed((items) => items.some((item) => item.id === question.id) ? items : [...items, question]);
    }
  };

  const nextQuestion = () => {
    if (questionIndex + 1 >= questions.length) setRoundDone(true);
    else {
      setQuestionIndex((value) => value + 1);
      setSelectedId(null);
      setFeedback(null);
    }
  };

  useEffect(() => {
    if (!autoAdvance || !feedback || mode !== 'quiz') return;
    const advanceTimer = window.setTimeout(nextQuestion, 5000);
    return () => window.clearTimeout(advanceTimer);
  }, [autoAdvance, feedback, mode, questionIndex, questions.length]);

  const restart = () => {
    setQuestionIndex(0); setSelectedId(null); setFeedback(null); setMissed([]); setRematchQuestions(null); setQuestionSet(shuffleStructures(stlParts.map(({ part }) => part))); setScore(0); setSeconds(0); setRoundDone(false);
  };

  const startRematch = () => {
    if (!missed.length) return;
    setQuestionIndex(0); setSelectedId(null); setFeedback(null); setRematchQuestions(missed); setMissed([]); setScore(0); setSeconds(0); setRoundDone(false);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><Activity size={19} strokeWidth={2.4} /></div><div><strong>Anatomi<span>Lab</span></strong><small>3D STUDIEATLAS</small></div></div>
        <div className="topbar-meta"><span className="live-dot" /> <span>Offline-läge aktivt</span><div className="avatar">AS</div></div>
      </header>

      <section className="workspace">
        <aside className="sidebar">
          <div className="eyebrow">Dagens pass</div>
          <h1>Bygg din<br /><em>anatomiska</em><br />blick.</h1>
          <p className="intro">Lär dig skelettets namn genom att koppla ihop svensk terminologi, latinsk nomenklatur och anatomisk position.</p>
          <div className="learning-goal"><BookOpen size={15} /><div><strong>Lärandemål</strong><span>Identifiera ben, kotor och skelettets delregioner.</span></div></div>
          <div className="mode-tabs"><button className={mode === 'quiz' ? 'active' : ''} onClick={() => setMode('quiz')}><Target size={16} /> Quiz</button><button className={mode === 'explore' ? 'active' : ''} onClick={() => setMode('explore')}><BookOpen size={16} /> Utforska</button></div>
          <div className="control-section"><div className="section-label">KATEGORI</div><div className="category-row"><div className="category-icon"><Layers3 size={17} /></div><div><strong>Skelett</strong><small>{stlParts.length} separata STL-delar</small></div><button className="icon-button" aria-label="Visa eller dölj skelett" onClick={() => setShowSkeleton((value) => !value)}>{showSkeleton ? <Eye size={17} /> : <EyeOff size={17} />}</button></div></div>
          <div className="control-section"><div className="section-label">SVÅRIGHETSGRAD</div><div className="difficulty-list">{(['beginner', 'intermediate', 'advanced'] as Difficulty[]).map((level) => <button key={level} className={difficulty === level ? 'selected' : ''} onClick={() => { setDifficulty(level); restart(); }}><span className="difficulty-dot" />{difficultyLabel[level]}<ChevronRight size={15} /></button>)}</div></div>
          <div className="sidebar-bottom"><div className="progress-card"><div className="progress-card-head"><span>Din progression</span><Sparkles size={15} /></div><strong>68<span>%</span></strong><div className="progress-bar"><i style={{ width: '68%' }} /></div><small>+12% sedan förra veckan</small></div><div className="settings-stack"><button className="settings-link" onClick={() => setLatinOnly((value) => !value)}><span className={`toggle ${latinOnly ? 'on' : ''}`}><i /></span> Träna bara latin</button><button className="settings-link" onClick={() => setAutoAdvance((value) => !value)}><span className={`toggle ${autoAdvance ? 'on' : ''}`}><i /></span> Byt fråga automatiskt</button></div></div>
        </aside>

        <section className="content">
          <div className="content-header"><div><div className="eyebrow">SKELETT · {mode === 'quiz' ? 'QUIZLÄGE' : 'UTFORSKARLÄGE'}</div><h2>{mode === 'quiz' ? 'Var sitter strukturen?' : 'Klicka och upptäck'}</h2></div><div className="header-actions"><div className="stat-pill"><TimerReset size={15} /><span>{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</span></div><div className="stat-pill"><Trophy size={15} /><span>{score} rätt</span></div></div></div>
          <div className="viewer-layout">
            <div className={`viewer ${showSkeleton ? '' : 'viewer-muted'}`}><div className="viewer-note"><Target size={14} /> Dra för att rotera · scrolla för att zooma</div><div className="axis-label">STL · 3D</div><div className="view-controls" aria-label="Välj kameravy"><button className="center-view" onClick={() => { setView('front'); setResetToken((value) => value + 1); }} title="Centrera modellen"><Crosshair size={15} /></button>{([['front', 'Fram'], ['left', 'Vänster'], ['right', 'Höger'], ['top', 'Topp'], ['back', 'Bak']] as [ViewAngle, string][]).map(([angle, label]) => <button key={angle} className={view === angle ? 'active' : ''} onClick={() => setView(angle)}>{label}</button>)}</div><Suspense fallback={<div className="stl-loading"><div className="loading-ring" /><strong>Laddar skelettets delar</strong><span>{stlParts.length} separata STL-filer förbereds</span></div>}><SkeletonMap selectedId={selectedId} feedback={feedback} onSelect={selectStructure} revealId={feedback === 'wrong' ? question.id : null} view={view} resetToken={resetToken} focusName={feedback === 'wrong' ? question.meshName : null} /></Suspense>{feedback && mode === 'quiz' && <div className={`feedback-toast ${feedback}`}><div className="feedback-icon">{feedback === 'correct' ? <Check size={20} /> : <X size={20} />}</div><div><strong>{feedback === 'correct' ? 'Rätt svar!' : 'Fel svar'}</strong><span>{feedback === 'correct' ? `${question.latinName} sitter där.` : `Du valde ${selectedStructure?.swedishName ?? 'en annan struktur'}. Rätt svar är markerat grönt.`}</span></div></div>}</div>
            <div className="quiz-panel">{mode === 'quiz' && !roundDone ? <><div className="question-meta"><span>FRÅGA {questionIndex + 1} <small>/ {questions.length}</small></span><span>{Math.round(progress)}%</span></div><div className="question-progress"><i style={{ width: `${progress}%` }} /></div><div className="prompt-label">HITTA PÅ MODELLEN</div><div className="prompt-name"><strong>{latinOnly ? question.latinName : question.swedishName}</strong>{!latinOnly && <span>{question.latinName}</span>}</div><p className="prompt-hint">Klicka på rätt del av skelettet. Du kan rotera modellen fritt.</p>{feedback && <button className="next-button" onClick={nextQuestion}>{questionIndex + 1 >= questions.length ? 'Visa resultat' : 'Nästa fråga'} <ChevronRight size={17} /></button>}{!feedback && <button className="skip-button" onClick={() => { setMissed((items) => items.some((item) => item.id === question.id) ? items : [...items, question]); nextQuestion(); }}><SkipForward size={16} /> Hoppa över</button>}</> : roundDone ? <div className="result-state"><div className="result-badge"><Trophy size={24} /></div><div className="eyebrow">RUNDA KLAR</div><h3>{score}<span>/{questions.length}</span></h3><p>Starkt jobbat. Du träffade rätt på {Math.round((score / questions.length) * 100)}% av strukturerna.</p><div className="result-row"><span>Tid</span><strong>{Math.floor(seconds / 60)}m {seconds % 60}s</strong></div><div className="result-row"><span>Missade</span><strong>{missed.length} strukturer</strong></div><div className="result-actions"><button className="next-button" onClick={restart}>Ny runda <RotateCcw size={16} /></button>{missed.length > 0 && <button className="skip-button" onClick={startRematch}>Träna missade <Target size={16} /></button>}</div></div> : <div className="explore-state"><div className="explore-icon"><BookOpen size={24} /></div><div className="eyebrow">UTFORSKA</div><h3>{explored ? explored.swedishName : 'Välj en struktur'}</h3>{explored ? <><span className="latin-large">{explored.latinName}</span><p>{explored.description}</p><div className="tag">{difficultyLabel[explored.difficulty]}</div></> : <p>Klicka på ett ben i modellen för att se namn och funktion.</p>}</div>}
            </div>
          </div>
          <div className="below-viewer"><div className="tip"><CircleHelp size={17} /><span><strong>Tips:</strong> Börja med de stora strukturerna och rotera sedan runt modellen för en ny vinkel.</span></div><div className="source-note">Modellunderlag: BodyParts3D · CC BY 2.1 JP</div></div>
        </section>
      </section>
    </main>
  );
}

export default App;
