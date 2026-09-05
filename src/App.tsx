import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { Activity, BookOpen, Check, ChevronRight, CircleHelp, Eye, EyeOff, Layers3, RotateCcw, SkipForward, Sparkles, Target, TimerReset, Trophy, X } from 'lucide-react';
import { difficultyLabel, skeletonStructures, type AnatomyStructure, type Difficulty } from './data/skeleton';

const feedbackColors = { correct: '#b8e986', wrong: '#ff9e8b' };

type Mode = 'quiz' | 'explore';
type Feedback = 'correct' | 'wrong' | null;

const stlFiles = import.meta.glob('/Skeleton/**/*.stl', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const stlEntries = Object.entries(stlFiles).sort(([left], [right]) => left.localeCompare(right));

function labelFromFile(path: string) {
  return path.split('/').pop()?.replace(/\.stl$/i, '').replace(/_/g, ' ') ?? 'Skelettdel';
}

function sideName(side: string | undefined) {
  return side === 'L' ? { swedish: 'vänster', latin: 'sinister' } : { swedish: 'höger', latin: 'dexter' };
}

function translateStlName(label: string) {
  const normalized = label.replace(/([LR])(?:_\d+)+$/, '$1');
  const side = normalized.match(/(?:^|_)(L|R)$/)?.[1];
  const sideLabel = sideName(side);
  const sideSuffix = side ? `, ${sideLabel.latin}` : '';
  const sideSwedish = side ? ` ${sideLabel.swedish}` : '';
  const numbered = normalized.match(/^(?:Distal|Intermediate|Proximal)_Phalange_(\d)(?:L|R)?$/);
  const ordinalSwedish = ['första', 'andra', 'tredje', 'fjärde', 'femte', 'sjätte', 'sjunde', 'åttonde', 'nionde', 'tionde', 'elfte', 'tolvte'];
  const romanNumeral = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

  if (numbered) {
    const number = numbered[1];
    const section = normalized.startsWith('Distal') ? ['ytterfalang', 'phalanx distalis'] : normalized.startsWith('Intermediate') ? ['mellanfalang', 'phalanx media'] : ['proximala falang', 'phalanx proximalis'];
    return { swedishName: `${section[0]} ${number}${sideSwedish}`, latinName: `${section[1]} ${number}${sideSuffix}` };
  }

  const vertebraMatch = normalized.match(/^(Cervical|Thoracic|Lumbar)_(\d+)$/);
  if (vertebraMatch) {
    const type = vertebraMatch[1];
    const index = Number(vertebraMatch[2]) - 1;
    const swedishType = type === 'Cervical' ? 'halskota' : type === 'Thoracic' ? 'bröstkota' : 'ländkota';
    const latinType = type === 'Cervical' ? 'vertebra cervicalis' : type === 'Thoracic' ? 'vertebra thoracica' : 'vertebra lumbalis';
    return { swedishName: `${ordinalSwedish[index]} ${swedishType}`, latinName: `${latinType} ${romanNumeral[index]}` };
  }

  const sacrumMatch = normalized.match(/^Sacrum_(\d+)$/);
  if (sacrumMatch) {
    const index = Number(sacrumMatch[1]) - 1;
    return { swedishName: `${ordinalSwedish[index]} korsbenet`, latinName: `Os sacrum ${romanNumeral[index]}` };
  }

  const names: Record<string, [string, string]> = {
    Skull: ['Skalle', 'Cranium'], Skull_1: ['Skalle', 'Cranium'],
    Mandible: ['Underkäke', 'Mandibula'], Maxilla: ['Överkäke', 'Maxilla'], Hyoid: ['Tungben', 'Os hyoideum'],
    Calcaneus: ['Hälben', 'Calcaneus'], Cuboid: ['Tärningsben', 'Os cuboideum'], Navicular: ['Båtben', 'Os naviculare'], Talus: ['Språngben', 'Talus'],
    Medial_Cuneiform: ['Mediala kilbenet', 'Os cuneiforme mediale'], Intermediate_Cuneiform: ['Mellersta kilbenet', 'Os cuneiforme intermedium'], Lateral_Cuneiform: ['Laterala kilbenet', 'Os cuneiforme laterale'],
    Metatarsal: ['Mellanfotsben', 'Os metatarsale'], Metacarpal: ['Mellanhandsben', 'Os metacarpale'],
    Capitate: ['Huvudben', 'Os capitatum'], Hamate: ['Hakben', 'Os hamatum'], Lunate: ['Månben', 'Os lunatum'], Pisiform: ['Ärtben', 'Os pisiforme'], Scaphoid: ['Båtben', 'Os scaphoideum'], Trapezium: ['Stora månghörningsbenet', 'Os trapezium'], Trapezoid: ['Lilla månghörningsbenet', 'Os trapezoideum'], Triquetral: ['Trekantben', 'Os triquetrum'],
    Clavicle: ['Nyckelben', 'Clavicula'], Femur: ['Lårben', 'Femur'], Fibula: ['Vadben', 'Fibula'], Humerus: ['Överarmsben', 'Humerus'], Patella: ['Knäskål', 'Patella'], Radius: ['Strålben', 'Radius'], Scapula: ['Skulderblad', 'Scapula'], Tibia: ['Skenben', 'Tibia'], Ulna: ['Armbågsben', 'Ulna'],
    Left_Hip: ['Vänster höftben', 'Os coxae sinister'], Right_Hip: ['Höger höftben', 'Os coxae dexter'],
    Manubrium: ['Bröstbenshandtag', 'Manubrium sterni'], Sternum: ['Bröstben', 'Sternum'], Xiphoid: ['Svärdutskott', 'Processus xiphoideus'],
    Sacrum_4: ['Korsben, del 4', 'Os sacrum IV'], Sacrum_5: ['Korsben, del 5', 'Os sacrum V'], Coccygeal_1: ['Första svanskotan', 'Vertebra coccygea I'], Coccygeal_2: ['Andra svanskotan', 'Vertebra coccygea II'], Coccygeal_3: ['Tredje svanskotan', 'Vertebra coccygea III'], Coccygeal_4: ['Fjärde svanskotan', 'Vertebra coccygea IV'],
  };
  const rib = normalized.match(/^R([LR])(\d+)$/);
  if (rib) return { swedishName: `${rib[2]}:e revbenet ${rib[1] === 'L' ? 'vänster' : 'höger'}`, latinName: `Costa ${rib[2]}${rib[1] === 'L' ? ' sinistra' : ' dextra'}` };
  const match = Object.entries(names).find(([key]) => normalized.startsWith(key));
  if (match) return { swedishName: `${match[1][0]}${sideSwedish}`, latinName: `${match[1][1]}${sideSuffix}` };
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
const assemblyScale = 5.05 / 1440.959877;
const assemblyCenter: [number, number, number] = [-0.006012, -115.477008, 650.000042];

function StlPartMesh({ url, entry, selectedId, feedback, revealId, onSelect }: { url: string; entry: { path: string; part: AnatomyStructure }; selectedId: string | null; feedback: Feedback; revealId: string | null; onSelect: (structure: AnatomyStructure) => void }) {
  const geometry = useLoader(STLLoader, url);
  const isSelected = selectedId === entry.part.id || revealId === entry.part.id;
  const color = feedback === 'correct' && isSelected ? feedbackColors.correct : feedback === 'wrong' && isSelected ? feedbackColors.wrong : isSelected ? '#d4f56a' : '#d8dfcc';
  return <mesh name={entry.part.meshName} geometry={geometry} onClick={(event) => { event.stopPropagation(); onSelect(entry.part); }}>
    <meshStandardMaterial color={color} roughness={0.7} metalness={0.02} />
  </mesh>;
}

function SkeletonMap({ selectedId, feedback, onSelect, revealId }: { selectedId: string | null; feedback: Feedback; onSelect: (structure: AnatomyStructure) => void; revealId: string | null }) {
  return (
    <div className="stl-stage" role="group" aria-label="Interaktiv 3D-modell av skelettet">
      <Canvas camera={{ position: [0, 0, 12], fov: 34 }} dpr={[1, 1.25]}>
        <color attach="background" args={['#101916']} />
        <ambientLight intensity={1.8} />
        <directionalLight position={[4, 5, 7]} intensity={2.8} color="#f4f0d5" />
        <directionalLight position={[-4, 2, 3]} intensity={1.1} color="#8bb9a4" />
        <group rotation={[-Math.PI / 2, 0, 0]} scale={assemblyScale} position={[-assemblyCenter[0] * assemblyScale, -assemblyCenter[2] * assemblyScale, assemblyCenter[1] * assemblyScale]}>
          {stlEntries.map(([path, url], index) => <Suspense key={path} fallback={null}><StlPartMesh url={url} entry={stlParts[index]} selectedId={selectedId} feedback={feedback} revealId={revealId} onSelect={onSelect} /></Suspense>)}
        </group>
        <OrbitControls enablePan enableZoom minDistance={4} maxDistance={14} />
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

  const questions = useMemo(() => rematchQuestions ?? skeletonStructures.filter((structure) => difficulty === 'beginner' ? structure.difficulty === 'beginner' : difficulty === 'intermediate' ? structure.difficulty !== 'advanced' : true).slice(0, 10), [difficulty, rematchQuestions]);
  const question = questions[questionIndex % questions.length];
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

  const restart = () => {
    setQuestionIndex(0); setSelectedId(null); setFeedback(null); setMissed([]); setRematchQuestions(null); setScore(0); setSeconds(0); setRoundDone(false);
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
          <p className="intro">Utforska skelettet i en riktig 3D-modell eller testa vad som sitter kvar inför tentan.</p>
          <div className="mode-tabs"><button className={mode === 'quiz' ? 'active' : ''} onClick={() => setMode('quiz')}><Target size={16} /> Quiz</button><button className={mode === 'explore' ? 'active' : ''} onClick={() => setMode('explore')}><BookOpen size={16} /> Utforska</button></div>
          <div className="control-section"><div className="section-label">KATEGORI</div><div className="category-row"><div className="category-icon"><Layers3 size={17} /></div><div><strong>Skelett</strong><small>{stlParts.length} separata STL-delar</small></div><button className="icon-button" aria-label="Visa eller dölj skelett" onClick={() => setShowSkeleton((value) => !value)}>{showSkeleton ? <Eye size={17} /> : <EyeOff size={17} />}</button></div></div>
          <div className="control-section"><div className="section-label">SVÅRIGHETSGRAD</div><div className="difficulty-list">{(['beginner', 'intermediate', 'advanced'] as Difficulty[]).map((level) => <button key={level} className={difficulty === level ? 'selected' : ''} onClick={() => { setDifficulty(level); restart(); }}><span className="difficulty-dot" />{difficultyLabel[level]}<ChevronRight size={15} /></button>)}</div></div>
          <div className="sidebar-bottom"><div className="progress-card"><div className="progress-card-head"><span>Din progression</span><Sparkles size={15} /></div><strong>68<span>%</span></strong><div className="progress-bar"><i style={{ width: '68%' }} /></div><small>+12% sedan förra veckan</small></div><button className="settings-link" onClick={() => setLatinOnly((value) => !value)}><span className={`toggle ${latinOnly ? 'on' : ''}`}><i /></span> Träna bara latin</button></div>
        </aside>

        <section className="content">
          <div className="content-header"><div><div className="eyebrow">SKELETT · {mode === 'quiz' ? 'QUIZLÄGE' : 'UTFORSKARLÄGE'}</div><h2>{mode === 'quiz' ? 'Var sitter strukturen?' : 'Klicka och upptäck'}</h2></div><div className="header-actions"><div className="stat-pill"><TimerReset size={15} /><span>{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</span></div><div className="stat-pill"><Trophy size={15} /><span>{score} rätt</span></div></div></div>
          <div className="viewer-layout">
            <div className={`viewer ${showSkeleton ? '' : 'viewer-muted'}`}><div className="viewer-note"><Target size={14} /> Dra för att rotera · scrolla för att zooma</div><div className="axis-label">STL · 3D</div><Suspense fallback={<div className="stl-loading"><div className="loading-ring" /><strong>Laddar skelettets delar</strong><span>{stlParts.length} separata STL-filer förbereds</span></div>}><SkeletonMap selectedId={selectedId} feedback={feedback} onSelect={selectStructure} revealId={feedback === 'wrong' ? question.id : null} /></Suspense>{feedback && mode === 'quiz' && <div className={`feedback-toast ${feedback}`}><div className="feedback-icon">{feedback === 'correct' ? <Check size={20} /> : <X size={20} />}</div><div><strong>{feedback === 'correct' ? 'Rätt svar!' : 'Inte riktigt'}</strong><span>{feedback === 'correct' ? `${question.latinName} sitter där.` : `Rätt struktur är markerad.`}</span></div></div>}</div>
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
