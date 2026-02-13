import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, MessageSquare, Check, Clock, Send, User, Film, FileText, Image, Scissors, Eye, CheckCircle, AlertCircle, Users, Download, Zap, Wand2, GitCompare, MousePointer2, Square, Circle, ArrowRight, Pencil, Type, Undo, Redo, Trash2, SkipBack, SkipForward, Volume2, Settings, X, Copy, Mail, Bell, BarChart3, Sparkles } from 'lucide-react';

const VideoReviewPlatform = () => {
  const [currentProject, setCurrentProject] = useState(null);
  const [videoTime, setVideoTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [commentTime, setCommentTime] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [selectedStakeholder, setSelectedStakeholder] = useState('all');
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [drawingMode, setDrawingMode] = useState(null);
  const [currentAnnotations, setCurrentAnnotations] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentShape, setCurrentShape] = useState(null);
  const [showVersionCompare, setShowVersionCompare] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState('current');
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [aiTranscript, setAiTranscript] = useState([]);
  const [showTranscript, setShowTranscript] = useState(false);
  const [detectedScenes, setDetectedScenes] = useState([]);
  const [frameRate, setFrameRate] = useState(24);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [showTemplateComments, setShowTemplateComments] = useState(false);
  const [waveformData, setWaveformData] = useState([]);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const annotationCanvasRef = useRef(null);
  const timelineRef = useRef(null);

  const workflowPhases = [
    { id: 'script', name: 'Script Review', icon: FileText, color: '#6366f1' },
    { id: 'storyboard', name: 'Storyboard', icon: Image, color: '#8b5cf6' },
    { id: 'rough', name: 'Rough Cut', icon: Scissors, color: '#ec4899' },
    { id: 'fine', name: 'Fine Cut', icon: Film, color: '#f59e0b' },
    { id: 'final', name: 'Final Review', icon: Eye, color: '#10b981' }
  ];

  const stakeholderTypes = [
    { id: 'all', name: 'Alle Stakeholder', color: '#64748b' },
    { id: 'client', name: 'Kunde', color: '#3b82f6' },
    { id: 'creative', name: 'Kreativ-Team', color: '#8b5cf6' },
    { id: 'production', name: 'Produktion', color: '#ec4899' },
    { id: 'legal', name: 'Legal/Compliance', color: '#f59e0b' },
    { id: 'technical', name: 'Technical', color: '#06b6d4' }
  ];

  const drawingTools = [
    { id: 'arrow', name: 'Pfeil', icon: ArrowRight },
    { id: 'rectangle', name: 'Rechteck', icon: Square },
    { id: 'circle', name: 'Kreis', icon: Circle },
    { id: 'freehand', name: 'Freihand', icon: Pencil },
    { id: 'text', name: 'Text', icon: Type }
  ];

  const templateComments = [
    { category: 'Audio', items: ['Audio-Pegel zu niedrig', 'Hintergrundgeräusche', 'Musik zu laut', 'Stimme verzerrt'] },
    { category: 'Bild', items: ['Unscharf', 'Über-/unterbelichtet', 'Farbstich', 'Bildausschnitt prüfen'] },
    { category: 'Schnitt', items: ['Transition holprig', 'Timing anpassen', 'Jump Cut', 'Zu schnell/langsam'] },
    { category: 'Text/Grafik', items: ['Rechtschreibfehler', 'Logo falsch', 'Grafik aktualisieren', 'Text unleserlich'] },
    { category: 'Compliance', items: ['DSGVO-Hinweis fehlt', 'Copyright prüfen', 'Disclaimer benötigt', 'Barrierefreiheit'] }
  ];

  const keyboardShortcuts = [
    { keys: 'Space', action: 'Play/Pause' },
    { keys: 'J/K/L', action: 'Rückwärts/Pause/Vorwärts' },
    { keys: '←/→', action: 'Frame zurück/vor' },
    { keys: 'C', action: 'Kommentar hinzufügen' },
    { keys: 'A', action: 'Annotationen ein/aus' },
    { keys: 'D', action: 'Drawing Mode' },
    { keys: '1-5', action: 'Playback Speed' },
    { keys: 'M', action: 'Mute' },
    { keys: 'F', action: 'Fullscreen' },
    { keys: '?', action: 'Shortcuts anzeigen' }
  ];

  const [projects, setProjects] = useState([
    {
      id: 1,
      title: 'E.ON NeX26 Event Highlight',
      phase: 'fine',
      video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      duration: 596,
      versions: [
        { id: 'v1', name: 'Version 1.0', date: '2024-02-09', video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
        { id: 'v2', name: 'Version 1.1', date: '2024-02-10', video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' }
      ],
      comments: [
        { 
          id: 1, 
          time: 15, 
          stakeholder: 'client', 
          author: 'Maria Schmidt', 
          text: 'Logo sollte größer sein', 
          status: 'open', 
          timestamp: '2024-02-10 14:30',
          annotations: [
            { type: 'rectangle', x: 100, y: 50, width: 200, height: 100, color: '#3b82f6' }
          ]
        },
        { 
          id: 2, 
          time: 45, 
          stakeholder: 'creative', 
          author: 'Tom Weber', 
          text: 'Transition hier zu abrupt', 
          status: 'resolved', 
          timestamp: '2024-02-10 15:12',
          annotations: []
        },
        { 
          id: 3, 
          time: 120, 
          stakeholder: 'legal', 
          author: 'Dr. Müller', 
          text: 'Compliance-Check: DSGVO-Hinweis fehlt', 
          status: 'open', 
          timestamp: '2024-02-11 09:15',
          priority: 'high',
          annotations: [
            { type: 'arrow', x1: 150, y1: 200, x2: 300, y2: 250, color: '#f59e0b' }
          ]
        }
      ],
      approvals: [
        { stakeholder: 'creative', approved: true, by: 'Tom Weber', date: '2024-02-11' },
        { stakeholder: 'production', approved: true, by: 'Lisa König', date: '2024-02-11' }
      ],
      uploadedBy: 'David',
      uploadDate: '2024-02-09',
      dueDate: '2024-02-15',
      analytics: {
        views: 47,
        avgViewTime: 324,
        comments: 12,
        avgResponseTime: 4.2 // hours
      }
    }
  ]);

  // Simulate active users
  useEffect(() => {
    setActiveUsers([
      { id: 1, name: 'Maria Schmidt', color: '#3b82f6', cursorPosition: { x: 0.3, y: 0.5 } },
      { id: 2, name: 'Tom Weber', color: '#8b5cf6', cursorPosition: { x: 0.7, y: 0.3 } }
    ]);
  }, []);

  // Generate fake waveform data
  useEffect(() => {
    if (currentProject) {
      const data = Array.from({ length: 100 }, () => Math.random() * 0.8 + 0.2);
      setWaveformData(data);
    }
  }, [currentProject]);

  // Simulate AI scene detection
  useEffect(() => {
    if (currentProject) {
      setDetectedScenes([
        { time: 0, label: 'Intro', confidence: 0.95 },
        { time: 30, label: 'Speaker Close-up', confidence: 0.88 },
        { time: 90, label: 'B-Roll', confidence: 0.92 },
        { time: 150, label: 'Audience Shots', confidence: 0.85 },
        { time: 220, label: 'Product Demo', confidence: 0.91 }
      ]);
    }
  }, [currentProject]);

  // Simulate AI transcription
  useEffect(() => {
    if (currentProject) {
      setAiTranscript([
        { time: 5, speaker: 'Sprecher 1', text: 'Willkommen zum NeX26 Event in der Elbphilharmonie Hamburg.' },
        { time: 12, speaker: 'Sprecher 1', text: 'Heute präsentieren wir die Zukunft der Energieversorgung.' },
        { time: 35, speaker: 'Sprecher 2', text: 'Mit unseren innovativen Lösungen gestalten wir die Energiewende aktiv mit.' },
        { time: 95, speaker: 'Sprecher 1', text: 'Lassen Sie uns einen Blick auf unsere neuesten Projekte werfen.' }
      ]);
    }
  }, [currentProject]);

  useEffect(() => {
    if (projects.length > 0 && !currentProject) {
      setCurrentProject(projects[0]);
    }
  }, [projects, currentProject]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setVideoTime(video.currentTime);
      setCurrentFrame(Math.floor(video.currentTime * frameRate));
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [currentProject, frameRate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      const video = videoRef.current;
      if (!video) return;

      switch(e.key) {
        case ' ':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'j':
          video.currentTime = Math.max(0, video.currentTime - 1/frameRate);
          break;
        case 'k':
          togglePlayPause();
          break;
        case 'l':
          video.currentTime = Math.min(video.duration, video.currentTime + 1/frameRate);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 1/frameRate);
          break;
        case 'ArrowRight':
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 1/frameRate);
          break;
        case 'c':
          addCommentAtTime();
          break;
        case 'a':
          setShowAnnotations(!showAnnotations);
          break;
        case 'd':
          setDrawingMode(drawingMode ? null : 'arrow');
          break;
        case 'm':
          video.muted = !video.muted;
          setVolume(video.muted ? 0 : 1);
          break;
        case 'f':
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            video.requestFullscreen();
          }
          break;
        case '?':
          setShowKeyboardShortcuts(!showKeyboardShortcuts);
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
          const speed = parseInt(e.key) * 0.5;
          video.playbackRate = speed;
          setPlaybackRate(speed);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, drawingMode, showAnnotations, showKeyboardShortcuts]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const addCommentAtTime = () => {
    setCommentTime(videoTime);
    setShowCommentDialog(true);
    if (isPlaying) togglePlayPause();
  };

  const submitComment = () => {
    if (!newComment.trim() || !currentProject) return;

    const comment = {
      id: Date.now(),
      time: commentTime,
      stakeholder: selectedStakeholder === 'all' ? 'client' : selectedStakeholder,
      author: 'David',
      text: newComment,
      status: 'open',
      timestamp: new Date().toLocaleString('de-DE'),
      annotations: currentAnnotations,
      frame: Math.floor(commentTime * frameRate)
    };

    setProjects(projects.map(p => 
      p.id === currentProject.id 
        ? { ...p, comments: [...p.comments, comment] }
        : p
    ));

    setNewComment('');
    setCurrentAnnotations([]);
    setShowCommentDialog(false);
    setCurrentProject({ ...currentProject, comments: [...currentProject.comments, comment] });
  };

  const submitTemplateComment = (templateText) => {
    const comment = {
      id: Date.now(),
      time: videoTime,
      stakeholder: 'technical',
      author: 'David',
      text: templateText,
      status: 'open',
      timestamp: new Date().toLocaleString('de-DE'),
      annotations: [],
      frame: Math.floor(videoTime * frameRate)
    };

    setProjects(projects.map(p => 
      p.id === currentProject.id 
        ? { ...p, comments: [...p.comments, comment] }
        : p
    ));

    setCurrentProject({ ...currentProject, comments: [...currentProject.comments, comment] });
    setShowTemplateComments(false);
  };

  const jumpToComment = (time) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = time;
      setVideoTime(time);
    }
  };

  const toggleCommentStatus = (commentId) => {
    setProjects(projects.map(p => 
      p.id === currentProject.id 
        ? {
            ...p,
            comments: p.comments.map(c => 
              c.id === commentId 
                ? { ...c, status: c.status === 'open' ? 'resolved' : 'open' }
                : c
            )
          }
        : p
    ));
    
    setCurrentProject({
      ...currentProject,
      comments: currentProject.comments.map(c => 
        c.id === commentId 
          ? { ...c, status: c.status === 'open' ? 'resolved' : 'open' }
          : c
      )
    });
  };

  const approveForStakeholder = (stakeholderType) => {
    const newApproval = {
      stakeholder: stakeholderType,
      approved: true,
      by: 'David',
      date: new Date().toISOString().split('T')[0]
    };

    setProjects(projects.map(p => 
      p.id === currentProject.id 
        ? {
            ...p,
            approvals: [...(p.approvals || []).filter(a => a.stakeholder !== stakeholderType), newApproval]
          }
        : p
    ));

    setCurrentProject({
      ...currentProject,
      approvals: [...(currentProject.approvals || []).filter(a => a.stakeholder !== stakeholderType), newApproval]
    });
  };

  // Drawing on canvas
  const handleCanvasMouseDown = (e) => {
    if (!drawingMode) return;
    
    const canvas = annotationCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setCurrentShape({ type: drawingMode, startX: x, startY: y, endX: x, endY: y });
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDrawing || !drawingMode) return;

    const canvas = annotationCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentShape(prev => ({ ...prev, endX: x, endY: y }));
    drawAnnotations();
  };

  const handleCanvasMouseUp = () => {
    if (!isDrawing) return;
    
    if (currentShape) {
      setCurrentAnnotations([...currentAnnotations, { ...currentShape, color: '#ec4899' }]);
    }
    
    setIsDrawing(false);
    setCurrentShape(null);
  };

  const drawAnnotations = () => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw saved annotations
    currentAnnotations.forEach(annotation => {
      drawShape(ctx, annotation);
    });

    // Draw current shape being drawn
    if (currentShape) {
      drawShape(ctx, currentShape);
    }
  };

  const drawShape = (ctx, shape) => {
    ctx.strokeStyle = shape.color || '#ec4899';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    switch(shape.type) {
      case 'rectangle':
        ctx.strokeRect(shape.startX, shape.startY, shape.endX - shape.startX, shape.endY - shape.startY);
        break;
      case 'circle':
        const radius = Math.sqrt(Math.pow(shape.endX - shape.startX, 2) + Math.pow(shape.endY - shape.startY, 2));
        ctx.beginPath();
        ctx.arc(shape.startX, shape.startY, radius, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      case 'arrow':
        drawArrow(ctx, shape.startX, shape.startY, shape.endX, shape.endY);
        break;
    }
  };

  const drawArrow = (ctx, fromX, fromY, toX, toY) => {
    const headlen = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  };

  useEffect(() => {
    drawAnnotations();
  }, [currentAnnotations, currentShape]);

  const exportToPDF = () => {
    // In a real implementation, this would generate a PDF
    alert('PDF Export wird generiert...\n\nEnthält:\n- Alle Kommentare mit Screenshots\n- Timeline-Übersicht\n- Stakeholder-Freigaben\n- Projekt-Analytics');
    setShowExportDialog(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimecode = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * frameRate);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
  };

  const getPhaseProgress = () => {
    const currentPhaseIndex = workflowPhases.findIndex(p => p.id === currentProject?.phase);
    return ((currentPhaseIndex + 1) / workflowPhases.length) * 100;
  };

  const filteredComments = currentProject?.comments.filter(c => 
    selectedStakeholder === 'all' || c.stakeholder === selectedStakeholder
  ) || [];

  const openCommentsCount = filteredComments.filter(c => c.status === 'open').length;
  const resolvedCommentsCount = filteredComments.filter(c => c.status === 'resolved').length;

  if (!currentProject) {
    return <div className="flex items-center justify-center h-screen bg-zinc-950 text-white">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-neutral-950 text-white font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap');
        
        * {
          font-family: 'Manrope', sans-serif;
        }
        
        .mono {
          font-family: 'Space Mono', monospace;
        }
        
        .timeline-marker {
          transition: all 0.2s ease;
        }
        
        .timeline-marker:hover {
          transform: scale(1.3);
          z-index: 10;
        }
        
        .comment-card {
          background: linear-gradient(135deg, rgba(39, 39, 42, 0.6), rgba(24, 24, 27, 0.8));
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.3s ease;
        }
        
        .comment-card:hover {
          border-color: rgba(99, 102, 241, 0.5);
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        
        .phase-indicator {
          transition: all 0.3s ease;
        }
        
        .phase-indicator.active {
          transform: scale(1.15);
          box-shadow: 0 0 20px currentColor;
        }
        
        .video-container {
          position: relative;
          background: linear-gradient(145deg, #18181b, #27272a);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }
        
        .glow {
          box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
        }
        
        .annotation-canvas {
          position: absolute;
          top: 0;
          left: 0;
          pointer-events: ${drawingMode ? 'auto' : 'none'};
          cursor: ${drawingMode ? 'crosshair' : 'default'};
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        
        .slide-in {
          animation: slideIn 0.4s ease-out;
        }
        
        .pulse {
          animation: pulse 2s ease-in-out infinite;
        }
        
        .gradient-text {
          background: linear-gradient(135deg, #6366f1, #ec4899);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .waveform-bar {
          transition: all 0.1s ease;
        }
        
        .active-user-cursor {
          position: absolute;
          pointer-events: none;
          transition: all 0.1s ease;
        }
        
        .drawing-tool {
          transition: all 0.2s ease;
        }
        
        .drawing-tool.active {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          transform: scale(1.05);
        }
      `}</style>

      {/* Keyboard Shortcuts Dialog */}
      {showKeyboardShortcuts && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowKeyboardShortcuts(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-2xl w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold gradient-text">Keyboard Shortcuts</h3>
              <button onClick={() => setShowKeyboardShortcuts(false)} className="p-2 hover:bg-zinc-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {keyboardShortcuts.map(shortcut => (
                <div key={shortcut.keys} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                  <span className="text-zinc-300">{shortcut.action}</span>
                  <kbd className="px-3 py-1 bg-zinc-700 rounded mono text-sm">{shortcut.keys}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Export Dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowExportDialog(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-md w-full mx-4 slide-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-bold mb-4 gradient-text">Export Optionen</h3>
            <div className="space-y-3">
              <button 
                onClick={exportToPDF}
                className="w-full p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-left transition-all flex items-center gap-3"
              >
                <Download className="w-5 h-5" />
                <div>
                  <div className="font-semibold">PDF Report</div>
                  <div className="text-sm text-zinc-400">Mit allen Kommentaren & Screenshots</div>
                </div>
              </button>
              <button className="w-full p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-left transition-all flex items-center gap-3">
                <FileText className="w-5 h-5" />
                <div>
                  <div className="font-semibold">EDL Export</div>
                  <div className="text-sm text-zinc-400">Für Premiere/FCP</div>
                </div>
              </button>
              <button className="w-full p-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-left transition-all flex items-center gap-3">
                <Mail className="w-5 h-5" />
                <div>
                  <div className="font-semibold">E-Mail versenden</div>
                  <div className="text-sm text-zinc-400">Report an Stakeholder</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Comments Dialog */}
      {showTemplateComments && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowTemplateComments(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto slide-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold gradient-text">Template Kommentare</h3>
              <button onClick={() => setShowTemplateComments(false)} className="p-2 hover:bg-zinc-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-6">
              {templateComments.map(category => (
                <div key={category.category}>
                  <h4 className="font-semibold mb-3 text-zinc-300">{category.category}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {category.items.map(item => (
                      <button
                        key={item}
                        onClick={() => submitTemplateComment(item)}
                        className="p-3 bg-zinc-800 hover:bg-indigo-600 rounded-lg text-left text-sm transition-all"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Film className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold gradient-text">ReviewFlow Pro</h1>
                <p className="text-xs text-zinc-500 mono">AI-Powered Video Review Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Active Users */}
              <div className="flex items-center gap-2 bg-zinc-900 px-4 py-2 rounded-lg border border-zinc-800">
                <Users className="w-4 h-4 text-zinc-400" />
                <div className="flex -space-x-2">
                  {activeUsers.map(user => (
                    <div 
                      key={user.id}
                      className="w-6 h-6 rounded-full border-2 border-zinc-900 flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: user.color }}
                      title={user.name}
                    >
                      {user.name[0]}
                    </div>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => setShowKeyboardShortcuts(true)}
                className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-zinc-800 transition-all"
                title="Keyboard Shortcuts (?)">
                <Settings className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setShowExportDialog(true)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-zinc-800 transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-pink-600 rounded-lg font-semibold hover:from-indigo-700 hover:to-pink-700 transition-all">
                Neues Projekt
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1800px] mx-auto px-6 py-8">
        {/* Project Info & Phase */}
        <div className="mb-8 slide-in">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">{currentProject.title}</h2>
              <div className="flex items-center gap-4 text-sm text-zinc-400">
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {currentProject.uploadedBy}
                </span>
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Fällig: {currentProject.dueDate}
                </span>
                <span className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  {currentProject.analytics.views} Views
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold mono">{formatTime(currentProject.duration)}</div>
                <div className="text-sm text-zinc-400">Gesamtlänge</div>
              </div>
              <button
                onClick={() => setShowVersionCompare(!showVersionCompare)}
                className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-zinc-800 transition-all"
                title="Version Compare"
              >
                <GitCompare className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Workflow Phases */}
          <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                Produktions-Workflow
              </h3>
              <span className="text-sm text-zinc-400">{Math.round(getPhaseProgress())}% abgeschlossen</span>
            </div>
            <div className="relative">
              <div className="absolute top-5 left-0 w-full h-1 bg-zinc-800 rounded-full">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full transition-all duration-500"
                  style={{ width: `${getPhaseProgress()}%` }}
                />
              </div>
              <div className="flex justify-between relative">
                {workflowPhases.map((phase, index) => {
                  const PhaseIcon = phase.icon;
                  const isActive = phase.id === currentProject.phase;
                  const isPast = workflowPhases.findIndex(p => p.id === currentProject.phase) > index;
                  return (
                    <div key={phase.id} className="flex flex-col items-center gap-2">
                      <div 
                        className={`phase-indicator w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                          isActive ? 'active' : ''
                        }`}
                        style={{ 
                          backgroundColor: isPast || isActive ? phase.color : '#27272a',
                          borderColor: isPast || isActive ? phase.color : '#3f3f46'
                        }}
                      >
                        <PhaseIcon className="w-5 h-5" />
                      </div>
                      <span className={`text-xs text-center max-w-[80px] ${isActive ? 'text-white font-semibold' : 'text-zinc-500'}`}>
                        {phase.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-4 gap-8">
          {/* Video Player - 3 columns */}
          <div className="col-span-3 space-y-6">
            <div className="video-container relative">
              <div className="relative aspect-video">
                <video
                  ref={videoRef}
                  src={currentProject.video}
                  className="w-full h-full"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                
                {/* Annotation Canvas */}
                {showAnnotations && (
                  <canvas
                    ref={annotationCanvasRef}
                    className="annotation-canvas w-full h-full"
                    width={1280}
                    height={720}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                  />
                )}

                {/* Active User Cursors */}
                {activeUsers.map(user => (
                  <div
                    key={user.id}
                    className="active-user-cursor"
                    style={{
                      left: `${user.cursorPosition.x * 100}%`,
                      top: `${user.cursorPosition.y * 100}%`,
                    }}
                  >
                    <MousePointer2 
                      className="w-5 h-5" 
                      style={{ color: user.color }}
                    />
                    <span className="text-xs ml-2 px-2 py-1 rounded bg-black/70" style={{ color: user.color }}>
                      {user.name}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Drawing Tools */}
              {drawingMode && (
                <div className="absolute top-4 right-4 bg-zinc-900/90 backdrop-blur-sm p-2 rounded-lg border border-zinc-700 flex gap-2">
                  {drawingTools.map(tool => {
                    const ToolIcon = tool.icon;
                    return (
                      <button
                        key={tool.id}
                        onClick={() => setDrawingMode(tool.id)}
                        className={`drawing-tool p-2 rounded-lg transition-all ${drawingMode === tool.id ? 'active' : 'bg-zinc-800 hover:bg-zinc-700'}`}
                        title={tool.name}
                      >
                        <ToolIcon className="w-5 h-5" />
                      </button>
                    );
                  })}
                  <div className="w-px bg-zinc-700" />
                  <button
                    onClick={() => setCurrentAnnotations([])}
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-red-600 transition-all"
                    title="Alle löschen"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setDrawingMode(null)}
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-all"
                    title="Schließen"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Video Controls */}
              <div className="p-4 bg-gradient-to-t from-black/90 via-black/70 to-transparent">
                {/* Advanced Timeline with Waveform */}
                <div className="mb-4">
                  <div className="relative h-16 bg-zinc-900/50 rounded-lg overflow-hidden">
                    {/* Waveform */}
                    <div className="absolute inset-0 flex items-center justify-around px-2">
                      {waveformData.map((amplitude, index) => (
                        <div
                          key={index}
                          className="waveform-bar bg-indigo-500/30 w-1 rounded-full transition-all"
                          style={{ 
                            height: `${amplitude * 100}%`,
                            opacity: index / waveformData.length < (videoTime / currentProject.duration) ? 1 : 0.3
                          }}
                        />
                      ))}
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 transition-all"
                        style={{ width: `${(videoTime / currentProject.duration) * 100}%` }}
                      />
                    </div>
                    
                    {/* Scene Markers */}
                    {detectedScenes.map(scene => (
                      <div
                        key={scene.time}
                        className="absolute top-0 bottom-0 w-px bg-yellow-500/50 cursor-pointer hover:bg-yellow-500"
                        style={{ left: `${(scene.time / currentProject.duration) * 100}%` }}
                        onClick={() => jumpToComment(scene.time)}
                        title={`${scene.label} (${Math.round(scene.confidence * 100)}% confidence)`}
                      >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-1 px-2 py-1 bg-yellow-500 text-black text-xs rounded whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity">
                          {scene.label}
                        </div>
                      </div>
                    ))}
                    
                    {/* Comment Markers */}
                    {currentProject.comments.map(comment => (
                      <div
                        key={comment.id}
                        className="timeline-marker absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full cursor-pointer border-2 border-white/50"
                        style={{ 
                          left: `${(comment.time / currentProject.duration) * 100}%`,
                          backgroundColor: stakeholderTypes.find(s => s.id === comment.stakeholder)?.color || '#64748b'
                        }}
                        onClick={() => jumpToComment(comment.time)}
                        title={`${comment.author}: ${comment.text.substring(0, 50)}...`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    onClick={togglePlayPause}
                    className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm hover:bg-white/20 flex items-center justify-center transition-all glow"
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                  </button>

                  {/* Frame Navigation */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        const video = videoRef.current;
                        video.currentTime = Math.max(0, video.currentTime - 1/frameRate);
                      }}
                      className="p-2 hover:bg-white/10 rounded-lg transition-all"
                      title="Frame zurück (←)"
                    >
                      <SkipBack className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        const video = videoRef.current;
                        video.currentTime = Math.min(video.duration, video.currentTime + 1/frameRate);
                      }}
                      className="p-2 hover:bg-white/10 rounded-lg transition-all"
                      title="Frame vor (→)"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Timecode Display */}
                  <div className="flex-1">
                    <div className="mono text-sm flex items-center gap-2">
                      <span className="text-white">{formatTimecode(videoTime)}</span>
                      <span className="text-zinc-500">/</span>
                      <span className="text-zinc-400">{formatTimecode(currentProject.duration)}</span>
                      <span className="text-zinc-600">|</span>
                      <span className="text-zinc-500 text-xs">Frame {currentFrame}</span>
                    </div>
                  </div>

                  {/* Playback Speed */}
                  <select
                    value={playbackRate}
                    onChange={(e) => {
                      const rate = parseFloat(e.target.value);
                      videoRef.current.playbackRate = rate;
                      setPlaybackRate(rate);
                    }}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1 text-sm focus:outline-none focus:border-indigo-500"
                  >
                    <option value="0.25">0.25x</option>
                    <option value="0.5">0.5x</option>
                    <option value="1">1x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2x</option>
                  </select>

                  {/* Volume */}
                  <button
                    onClick={() => {
                      const video = videoRef.current;
                      video.muted = !video.muted;
                      setVolume(video.muted ? 0 : 1);
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-all"
                  >
                    <Volume2 className={`w-5 h-5 ${volume === 0 ? 'opacity-50' : ''}`} />
                  </button>

                  {/* AI Features */}
                  <button
                    onClick={() => setShowTranscript(!showTranscript)}
                    className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all ${
                      showTranscript ? 'bg-indigo-600' : 'bg-zinc-800 hover:bg-zinc-700'
                    }`}
                  >
                    <Wand2 className="w-4 h-4" />
                    <span className="text-sm">Transcript</span>
                  </button>

                  {/* Drawing Mode Toggle */}
                  <button
                    onClick={() => setDrawingMode(drawingMode ? null : 'arrow')}
                    className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all ${
                      drawingMode ? 'bg-pink-600' : 'bg-zinc-800 hover:bg-zinc-700'
                    }`}
                    title="Drawing Mode (D)"
                  >
                    <Pencil className="w-4 h-4" />
                    <span className="text-sm">Draw</span>
                  </button>

                  {/* Comment Button */}
                  <button
                    onClick={addCommentAtTime}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-pink-600 rounded-lg flex items-center gap-2 transition-all font-semibold hover:from-indigo-700 hover:to-pink-700"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Kommentar
                  </button>

                  {/* Template Comments */}
                  <button
                    onClick={() => setShowTemplateComments(true)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center gap-2 transition-all"
                    title="Template Kommentare"
                  >
                    <Zap className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* AI Transcript */}
            {showTranscript && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 slide-in">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-indigo-400" />
                    AI-Transkription
                  </h3>
                  <button onClick={() => setShowTranscript(false)}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {aiTranscript.map((item, index) => (
                    <div 
                      key={index} 
                      className="p-3 bg-zinc-800/50 rounded-lg cursor-pointer hover:bg-zinc-800 transition-all"
                      onClick={() => jumpToComment(item.time)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="mono text-xs text-indigo-400">{formatTime(item.time)}</span>
                        <span className="text-xs text-zinc-500">{item.speaker}</span>
                      </div>
                      <p className="text-sm text-zinc-300">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comment Dialog */}
            {showCommentDialog && (
              <div className="comment-card rounded-xl p-6 slide-in border border-indigo-500/30">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Neuer Kommentar
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="mono text-sm text-zinc-400">{formatTimecode(commentTime)}</span>
                    <span className="text-xs text-zinc-500">Frame {Math.floor(commentTime * frameRate)}</span>
                  </div>
                </div>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Dein Feedback hier... (z.B. 'Logo sollte größer sein', 'Transition zu schnell', etc.)"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 mb-4 resize-none focus:outline-none focus:border-indigo-500 transition-colors"
                  rows="4"
                  autoFocus
                />
                {currentAnnotations.length > 0 && (
                  <div className="mb-4 p-3 bg-pink-500/10 border border-pink-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-pink-400">
                      <Pencil className="w-4 h-4" />
                      {currentAnnotations.length} Annotation(en) hinzugefügt
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={submitComment}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-pink-600 rounded-lg flex items-center justify-center gap-2 font-semibold hover:from-indigo-700 hover:to-pink-700 transition-all"
                  >
                    <Send className="w-4 h-4" />
                    Absenden
                  </button>
                  <button
                    onClick={() => {
                      setShowCommentDialog(false);
                      setNewComment('');
                      setCurrentAnnotations([]);
                    }}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                <div className="text-3xl font-bold mb-1">{filteredComments.length}</div>
                <div className="text-sm text-zinc-400">Kommentare</div>
              </div>
              <div className="bg-zinc-900/50 border border-amber-900/30 rounded-xl p-4">
                <div className="text-3xl font-bold mb-1 text-amber-500">{openCommentsCount}</div>
                <div className="text-sm text-zinc-400">Offen</div>
              </div>
              <div className="bg-zinc-900/50 border border-green-900/30 rounded-xl p-4">
                <div className="text-3xl font-bold mb-1 text-green-500">{resolvedCommentsCount}</div>
                <div className="text-sm text-zinc-400">Erledigt</div>
              </div>
              <div className="bg-zinc-900/50 border border-indigo-900/30 rounded-xl p-4">
                <div className="text-3xl font-bold mb-1 text-indigo-400">{detectedScenes.length}</div>
                <div className="text-sm text-zinc-400">AI Scenes</div>
              </div>
            </div>

            {/* Analytics */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
                Projekt Analytics
              </h3>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <div className="text-2xl font-bold mb-1">{currentProject.analytics.views}</div>
                  <div className="text-sm text-zinc-400">Total Views</div>
                </div>
                <div>
                  <div className="text-2xl font-bold mb-1">{formatTime(currentProject.analytics.avgViewTime)}</div>
                  <div className="text-sm text-zinc-400">Ø View Time</div>
                </div>
                <div>
                  <div className="text-2xl font-bold mb-1">{currentProject.analytics.avgResponseTime}h</div>
                  <div className="text-sm text-zinc-400">Ø Response Time</div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            {/* Stakeholder Filter */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <h3 className="font-semibold mb-3 text-sm text-zinc-400 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Filter Stakeholder
              </h3>
              <div className="space-y-2">
                {stakeholderTypes.map(type => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedStakeholder(type.id)}
                    className={`w-full px-3 py-2 rounded-lg text-left text-sm transition-all ${
                      selectedStakeholder === type.id
                        ? 'bg-zinc-800 font-semibold'
                        : 'hover:bg-zinc-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: type.color }}
                      />
                      {type.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Approvals */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                Freigaben
              </h3>
              <div className="space-y-2">
                {stakeholderTypes.filter(s => s.id !== 'all').map(type => {
                  const approval = currentProject.approvals?.find(a => a.stakeholder === type.id);
                  return (
                    <div key={type.id} className="flex items-center justify-between">
                      <span className="text-sm">{type.name}</span>
                      {approval ? (
                        <div className="flex items-center gap-2 text-green-500 text-xs">
                          <Check className="w-4 h-4" />
                          <span>{approval.by}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => approveForStakeholder(type.id)}
                          className="text-xs px-3 py-1 bg-zinc-800 hover:bg-green-600 rounded transition-all"
                        >
                          Freigeben
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {currentProject.approvals?.length === stakeholderTypes.length - 1 && (
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-green-400 text-sm font-semibold">
                    <CheckCircle className="w-4 h-4" />
                    Alle Freigaben erteilt!
                  </div>
                </div>
              )}
            </div>

            {/* Version History */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-indigo-400" />
                Versionen
              </h3>
              <div className="space-y-2">
                {currentProject.versions?.map(version => (
                  <div
                    key={version.id}
                    className="p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">{version.name}</span>
                      <span className="text-xs text-zinc-500">{version.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Kommentare ({filteredComments.length})
              </h3>
              <div className="space-y-3 max-h-[800px] overflow-y-auto pr-2">
                {filteredComments.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Noch keine Kommentare</p>
                  </div>
                ) : (
                  filteredComments
                    .sort((a, b) => a.time - b.time)
                    .map(comment => (
                      <div key={comment.id} className="comment-card rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: stakeholderTypes.find(s => s.id === comment.stakeholder)?.color }}
                            />
                            <span className="font-semibold text-sm">{comment.author}</span>
                            {comment.priority === 'high' && (
                              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                                Hoch
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => toggleCommentStatus(comment.id)}
                            className={`p-1 rounded transition-all ${
                              comment.status === 'resolved'
                                ? 'bg-green-600 text-white'
                                : 'bg-zinc-800 hover:bg-zinc-700'
                            }`}
                          >
                            {comment.status === 'resolved' ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <AlertCircle className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <p className="text-sm text-zinc-300 mb-3">{comment.text}</p>
                        {comment.annotations && comment.annotations.length > 0 && (
                          <div className="mb-2 flex items-center gap-1 text-xs text-pink-400">
                            <Pencil className="w-3 h-3" />
                            {comment.annotations.length} Annotation(en)
                          </div>
                        )}
                        <div className="flex items-center justify-between text-xs text-zinc-500">
                          <button
                            onClick={() => jumpToComment(comment.time)}
                            className="mono hover:text-indigo-400 transition-colors flex items-center gap-1"
                          >
                            <span>{formatTimecode(comment.time)}</span>
                            <span className="text-zinc-600">|</span>
                            <span>Frame {comment.frame}</span>
                          </button>
                          <span>{comment.timestamp}</span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoReviewPlatform;
