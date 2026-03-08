import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import type { Session, User } from '@supabase/supabase-js';
import './App.css';

// ============================================================
// TYPES
// ============================================================
interface Person {
  id: string;
  name: string;
  nickname: string | null;
  birthdate: string | null;
  photo_url: string | null;
  color: string;
  zodiac_sign: string | null;
  relationship: string | null;
  notes: string | null;
  created_at: string;
}

const RELATIONSHIPS = [
  { value: 'crush', label: '💕 Crush / Ficante' },
  { value: 'namorado', label: '❤️ Namorado(a)' },
  { value: 'amigo', label: '🤝 Amigo(a)' },
  { value: 'familia', label: '👨‍👩‍👧 Família' },
  { value: 'outro', label: '✨ Outro' },
];

function getZodiacSign(dateStr: string): { sign: string; emoji: string } {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDate();
  const month = date.getMonth() + 1;

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return { sign: 'Áries', emoji: '♈' };
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return { sign: 'Touro', emoji: '♉' };
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return { sign: 'Gêmeos', emoji: '♊' };
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return { sign: 'Câncer', emoji: '♋' };
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return { sign: 'Leão', emoji: '♌' };
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return { sign: 'Virgem', emoji: '♍' };
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return { sign: 'Libra', emoji: '♎' };
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return { sign: 'Escorpião', emoji: '♏' };
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return { sign: 'Sagitário', emoji: '♐' };
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return { sign: 'Capricórnio', emoji: '♑' };
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return { sign: 'Aquário', emoji: '♒' };
  return { sign: 'Peixes', emoji: '♓' };
}

function getRelationshipLabel(value: string | null): string {
  return RELATIONSHIPS.find(r => r.value === value)?.label || '✨ Outro';
}

interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

interface Memory {
  id: string;
  person_id: string;
  category_id: string | null;
  title: string;
  content: string | null;
  created_at: string;
  categories?: Category;
}

interface Photo {
  id: string;
  photo_url: string;
  caption: string | null;
  created_at: string;
}

interface Plan {
  id: string;
  title: string;
  is_completed: boolean;
  created_at: string;
}

const CARD_COLORS = ['#FF6B8A', '#C4B1D4', '#B5EAD7', '#FFDAB9', '#B8D4E3', '#FFE4A0', '#FF9AA2', '#A8D8EA'];

// ============================================================
// AUTH COMPONENT
// ============================================================
function AuthPage({ onAuth }: { onAuth: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName } }
        });
        if (error) throw error;
      }
      onAuth();
    } catch (err: any) {
      setError(err.message || 'Algo deu errado 😢');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <h1 className="auth-logo">Memora 💕</h1>
      <p className="auth-subtitle">Guarde tudo sobre quem você ama</p>

      <div className="auth-card">
        <h2>{isLogin ? 'Entrar' : 'Criar conta'}</h2>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="auth-input-group">
              <label>Seu nome</label>
              <input type="text" className="auth-input" placeholder="Como quer ser chamado?" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
            </div>
          )}

          <div className="auth-input-group">
            <label>Email</label>
            <input type="email" className="auth-input" placeholder="seuemail@mail.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="auth-input-group">
            <label>Senha</label>
            <input type="password" className="auth-input" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? '...' : isLogin ? 'Entrar 💖' : 'Criar conta 🌟'}
          </button>
        </form>

        <p className="auth-toggle">
          {isLogin ? 'Não tem conta? ' : 'Já tem conta? '}
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }}>
            {isLogin ? 'Criar uma!' : 'Fazer login'}
          </button>
        </p>
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD COMPONENT
// ============================================================
function Dashboard({ user, onSelectPerson, onLogout }: { user: User; onSelectPerson: (p: Person) => void; onLogout: () => void; }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [memoryCounts, setMemoryCounts] = useState<Record<string, number>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNickname, setNewNickname] = useState('');
  const [newBirthdate, setNewBirthdate] = useState('');
  const [newRelationship, setNewRelationship] = useState('crush');
  const [newNotes, setNewNotes] = useState('');
  const [newColor, setNewColor] = useState(CARD_COLORS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadPeople(); }, []);

  const loadPeople = async () => {
    const { data } = await supabase.from('people').select('*').order('created_at', { ascending: false });
    if (data) {
      setPeople(data);
      const counts: Record<string, number> = {};
      for (const person of data) {
        const { count } = await supabase.from('memories').select('*', { count: 'exact', head: true }).eq('person_id', person.id);
        counts[person.id] = count || 0;
      }
      setMemoryCounts(counts);
    }
  };

  const addPerson = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const zodiac = newBirthdate ? getZodiacSign(newBirthdate) : null;
    const { error } = await supabase.from('people').insert({
      user_id: user.id, name: newName, nickname: newNickname || null,
      birthdate: newBirthdate || null, zodiac_sign: zodiac ? `${zodiac.emoji} ${zodiac.sign}` : null,
      relationship: newRelationship, notes: newNotes || null, color: newColor
    });
    if (!error) {
      setNewName(''); setNewNickname(''); setNewBirthdate(''); setNewRelationship('crush'); setNewNotes(''); setNewColor(CARD_COLORS[0]);
      setShowAddModal(false); loadPeople();
    }
    setSaving(false);
  };

  const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'você';

  return (
    <div className="app-layout">
      <header className="top-bar">
        <span className="app-brand">Memora</span>
        <button className="icon-btn" onClick={onLogout} title="Sair">👋</button>
      </header>

      <div className="welcome-section">
        <p className="welcome-text">Olá, {displayName} 👋</p>
        <h1 className="welcome-title">Suas pessoas <span>especiais</span></h1>
      </div>

      <section className="people-section">
        <p className="section-label">{people.length} {people.length === 1 ? 'pessoa' : 'pessoas'}</p>
        <div className="people-grid">
          {people.map((person) => (
            <div key={person.id} className="person-card" onClick={() => onSelectPerson(person)}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: person.color, borderRadius: '28px 28px 0 0' }} />
              {person.photo_url ? (
                <img src={person.photo_url} alt={person.name} className="person-card-avatar" style={{ objectFit: 'cover' }} />
              ) : (
                <div className="person-card-avatar" style={{ background: person.color }}>{person.name[0]}</div>
              )}
              <span className="person-card-name">{person.nickname || person.name}</span>
              {person.zodiac_sign && <span className="person-card-birth">{person.zodiac_sign}</span>}
              <div className="person-card-tags">
                <span className="mini-tag">{getRelationshipLabel(person.relationship)}</span>
                <span className="mini-tag">{memoryCounts[person.id] || 0} 💭</span>
              </div>
            </div>
          ))}
          <button className="add-person-card" onClick={() => setShowAddModal(true)}>
            <div className="plus-circle">+</div>
            <span>Adicionar</span>
          </button>
        </div>
      </section>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header">
              <h2>Nova pessoa 💕</h2>
              <button className="icon-btn" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={addPerson}>
              <div className="modal-input-group"><label>Nome</label><input type="text" className="modal-input" placeholder="Qual o nome dessa pessoa especial?" value={newName} onChange={(e) => setNewName(e.target.value)} required autoFocus /></div>
              <div className="modal-input-group"><label>Apelido carinhoso (opcional)</label><input type="text" className="modal-input" placeholder="Ex: Meu amor, Mozão, Lili..." value={newNickname} onChange={(e) => setNewNickname(e.target.value)} /></div>
              <div className="modal-input-group"><label>Quem é essa pessoa?</label>
                <select className="modal-input" value={newRelationship} onChange={(e) => setNewRelationship(e.target.value)}>
                  {RELATIONSHIPS.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
                </select>
              </div>
              <div className="modal-input-group"><label>Data de Nascimento</label><input type="date" className="modal-input" value={newBirthdate} onChange={(e) => setNewBirthdate(e.target.value)} />
                {newBirthdate && <p style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: 'var(--accent-pink)', fontWeight: 600, marginLeft: '0.3rem' }}>{getZodiacSign(newBirthdate).emoji} {getZodiacSign(newBirthdate).sign}</p>}
              </div>
              <div className="modal-input-group"><label>Anotação rápida (opcional)</label><input type="text" className="modal-input" placeholder="Ex: Ama girassóis e chocolate Lindt 🌻🍫" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} /></div>
              <div className="modal-input-group"><label>Cor do cartão</label>
                <div className="color-picker-grid">{CARD_COLORS.map((c) => (<div key={c} className={`color-swatch ${newColor === c ? 'active' : ''}`} style={{ backgroundColor: c }} onClick={() => setNewColor(c)} />))}</div>
              </div>
              <button type="submit" className="modal-btn" disabled={saving || !newName.trim()}>{saving ? 'Salvando...' : 'Salvar 💖'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// PERSON DETAIL COMPONENT
// ============================================================
function PersonDetail({ person: initialPerson, onBack, user }: { person: Person; onBack: () => void; user: User; }) {
  const [person, setPerson] = useState<Person>(initialPerson);
  const [categories, setCategories] = useState<Category[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [showEditMemory, setShowEditMemory] = useState(false);
  const [editMemoryId, setEditMemoryId] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showEditPerson, setShowEditPerson] = useState(false);
  const [memTitle, setMemTitle] = useState('');
  const [memContent, setMemContent] = useState('');
  const [memCategoryId, setMemCategoryId] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('📝');

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [uploadingPhotoGrid, setUploadingPhotoGrid] = useState(false);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editName, setEditName] = useState(person.name);
  const [editNickname, setEditNickname] = useState(person.nickname || '');
  const [editBirthdate, setEditBirthdate] = useState(person.birthdate || '');
  const [editRelationship, setEditRelationship] = useState(person.relationship || 'outro');
  const [editNotes, setEditNotes] = useState(person.notes || '');
  const [editColor, setEditColor] = useState(person.color);

  useEffect(() => { loadCategories(); loadMemories(); loadExtras(); }, [person.id]);

  const loadExtras = async () => {
    const { data: pData } = await supabase.from('photos').select('*').eq('person_id', person.id).order('created_at', { ascending: false });
    if (pData) setPhotos(pData);
    const { data: plData } = await supabase.from('plans').select('*').eq('person_id', person.id).order('created_at', { ascending: true });
    if (plData) setPlans(plData);
  };

  const reloadPerson = async () => {
    const { data } = await supabase.from('people').select('*').eq('id', person.id).single();
    if (data) setPerson(data);
  };

  const loadCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) { setCategories(data); if (data.length > 0) setMemCategoryId(data[0].id); }
  };

  const loadMemories = async () => {
    const { data } = await supabase.from('memories').select('*, categories(*)').eq('person_id', person.id).order('created_at', { ascending: false });
    if (data) setMemories(data);
  };

  const addMemory = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const { error } = await supabase.from('memories').insert({ person_id: person.id, category_id: memCategoryId || null, title: memTitle, content: memContent || null });
    if (!error) { setMemTitle(''); setMemContent(''); setShowAddMemory(false); loadMemories(); }
    setSaving(false);
  };

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const { data, error } = await supabase.from('categories').insert({ user_id: user.id, name: newCatName, emoji: newCatEmoji, color: CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)] }).select().single();
    if (!error && data) { setNewCatName(''); setNewCatEmoji('📝'); setShowAddCategory(false); loadCategories(); setMemCategoryId(data.id); setShowAddMemory(true); }
    setSaving(false);
  };

  const deleteMemory = async (id: string) => { await supabase.from('memories').delete().eq('id', id); loadMemories(); };

  const saveEditMemory = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const { error } = await supabase.from('memories').update({
      category_id: memCategoryId || null, title: memTitle, content: memContent || null
    }).eq('id', editMemoryId);
    if (!error) { setShowEditMemory(false); loadMemories(); setMemTitle(''); setMemContent(''); }
    setSaving(false);
  };

  const openEditMemoryModal = (mem: Memory) => {
    setEditMemoryId(mem.id);
    setMemTitle(mem.title);
    setMemContent(mem.content || '');
    setMemCategoryId(mem.category_id || '');
    setShowEditMemory(true);
  };

  const handleGridPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhotoGrid(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${user.id}/grid_${person.id}_${fileName}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await supabase.from('photos').insert({ user_id: user.id, person_id: person.id, photo_url: urlData.publicUrl });
      loadExtras();
    }
    setUploadingPhotoGrid(false);
  };

  const deletePhoto = async (id: string) => { await supabase.from('photos').delete().eq('id', id); loadExtras(); };

  const addPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanTitle.trim()) return;
    setSaving(true);
    await supabase.from('plans').insert({ user_id: user.id, person_id: person.id, title: newPlanTitle });
    setNewPlanTitle('');
    loadExtras();
    setSaving(false);
  };

  const togglePlan = async (id: string, is_completed: boolean) => {
    await supabase.from('plans').update({ is_completed: !is_completed }).eq('id', id);
    loadExtras();
  };

  const deletePlan = async (id: string) => { await supabase.from('plans').delete().eq('id', id); loadExtras(); };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/${person.id}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await supabase.from('people').update({ photo_url: urlData.publicUrl + '?t=' + Date.now() }).eq('id', person.id);
      reloadPerson();
    }
    setUploading(false);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    const zodiac = editBirthdate ? getZodiacSign(editBirthdate) : null;
    const { error } = await supabase.from('people').update({
      name: editName, nickname: editNickname || null, birthdate: editBirthdate || null,
      zodiac_sign: zodiac ? `${zodiac.emoji} ${zodiac.sign}` : null, relationship: editRelationship,
      notes: editNotes || null, color: editColor,
    }).eq('id', person.id);
    if (!error) { setShowEditPerson(false); reloadPerson(); }
    setSaving(false);
  };

  const openEditModal = () => {
    setEditName(person.name); setEditNickname(person.nickname || ''); setEditBirthdate(person.birthdate || '');
    setEditRelationship(person.relationship || 'outro'); setEditNotes(person.notes || ''); setEditColor(person.color);
    setShowEditPerson(true);
  };

  const grouped = memories.reduce((acc, mem) => {
    const key = `${mem.categories?.emoji || '📝'} ${mem.categories?.name || 'Sem categoria'}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(mem);
    return acc;
  }, {} as Record<string, Memory[]>);

  const EMOJI_OPTIONS = ['📝', '🍕', '🎬', '🎵', '🎨', '🎮', '📚', '✈️', '🐶', '💫', '🌻', '👗', '📍', '📅', '💖', '🏠', '🎁', '☕', '🍓', '🌈', '⭐', '🎸', '🏖️', '🍰', '🧸', '🍫'];

  return (
    <div className="person-page">
      <header className="top-bar">
        <button className="icon-btn" onClick={onBack}>←</button>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="icon-btn" onClick={openEditModal} title="Editar">✏️</button>
          <button className="icon-btn" onClick={() => setShowAddMemory(true)}>+</button>
        </div>
      </header>

      <div className="person-hero">
        <label className="avatar-upload-wrapper" title="Trocar foto">
          <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
          {person.photo_url ? (
            <img src={person.photo_url} alt={person.name} className="person-avatar-img" style={{ borderColor: person.color }} />
          ) : (
            <div className="person-avatar-big" style={{ background: person.color }}>{person.name[0]}</div>
          )}
          <div className="avatar-upload-badge">{uploading ? '...' : '📷'}</div>
        </label>
        <div>
          <h1 className="person-name">{person.nickname || person.name}</h1>
          {person.nickname && <p className="person-birth" style={{ fontWeight: 600 }}>{person.name}</p>}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
            {person.zodiac_sign && <span className="mini-tag">{person.zodiac_sign}</span>}
            {person.birthdate && <span className="mini-tag">🎂 {new Date(person.birthdate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
            <span className="mini-tag">{getRelationshipLabel(person.relationship)}</span>
          </div>
        </div>
      </div>

      {person.notes && (
        <div style={{ padding: '0 1.5rem 1rem', fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic', fontWeight: 500 }}>
          "{person.notes}"
        </div>
      )}

      <div className="memories-area">
        {Object.keys(grouped).length === 0 ? (
          <div className="empty-state">
            <div className="empty-emoji">💭</div>
            <p>Nenhuma memória ainda.<br />Salve a comida favorita, as marcas de chocolate, a flor preferida... 💛</p>
          </div>
        ) : (
          Object.entries(grouped).map(([catName, mems]) => (
            <div key={catName} className="category-section">
              <h3 className="category-title">{catName}</h3>
              <div className="memory-list">
                {mems.map((mem) => (
                  <div key={mem.id} className="memory-item">
                    <div>
                      <div className="memory-item-title">{mem.title}</div>
                      {mem.content && <div className="memory-item-content">{mem.content}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.2rem' }}>
                      <button className="icon-btn" onClick={() => openEditMemoryModal(mem)} title="Editar" style={{ width: 34, height: 34, fontSize: '0.85rem' }}>✏️</button>
                      <button className="icon-btn" onClick={() => deleteMemory(mem.id)} title="Remover" style={{ width: 34, height: 34, fontSize: '0.85rem' }}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
        <button className="add-memory-btn" onClick={() => setShowAddMemory(true)}>+ Adicionar memória</button>
      </div>

      <div className="extras-area" style={{ padding: '1rem 1.5rem 3rem' }}>
        {/* MURAL DE FOTOS */}
        <div className="category-section" style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="category-title" style={{ marginTop: 0 }}>Nosso Mural 📸</h3>
            <label className="icon-btn" style={{ cursor: 'pointer', background: 'var(--bg-primary)', padding: '0.4rem', borderRadius: '12px' }}>
              <input type="file" accept="image/*" onChange={handleGridPhotoUpload} style={{ display: 'none' }} />
              <span style={{ fontSize: '1.2rem', display: 'block', lineHeight: 1 }}>{uploadingPhotoGrid ? '⏳' : '➕'}</span>
            </label>
          </div>
          {photos.length === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem' }}>
              <p>Nenhuma foto no mural ainda. Guarde os seus melhores momentos juntos! ✨</p>
            </div>
          ) : (
            <div className="photo-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px', marginTop: '1rem' }}>
              {photos.map(p => (
                <div key={p.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.08)' }}>
                  <img src={p.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button onClick={() => deletePhoto(p.id)} style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.4)', color: 'white', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', backdropFilter: 'blur(4px)' }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PLANOS E METAS */}
        <div className="category-section" style={{ marginTop: '2.5rem' }}>
          <h3 className="category-title" style={{ marginTop: 0 }}>Planos & Metas ✨</h3>
          <div className="plans-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1rem' }}>
            {plans.map(plan => (
              <div key={plan.id} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'var(--bg-primary)', padding: '0.8rem 1rem', borderRadius: '16px', border: '1px solid rgba(0,0,0,0.02)' }}>
                <input type="checkbox" checked={plan.is_completed} onChange={() => togglePlan(plan.id, plan.is_completed)} style={{ width: '22px', height: '22px', cursor: 'pointer', accentColor: 'var(--accent-pink)' }} />
                <span style={{ flex: 1, textDecoration: plan.is_completed ? 'line-through' : 'none', color: plan.is_completed ? 'var(--text-muted)' : 'var(--text-primary)', fontWeight: 600, fontSize: '0.95rem', transition: 'all 0.2s' }}>{plan.title}</span>
                <button className="icon-btn" onClick={() => deletePlan(plan.id)} style={{ width: 32, height: 32, fontSize: '0.85rem' }}>🗑️</button>
              </div>
            ))}
            <form onSubmit={addPlan} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem' }}>
              <input type="text" className="modal-input" placeholder="Novo plano (Ex: Viagem pra praia)..." value={newPlanTitle} onChange={e => setNewPlanTitle(e.target.value)} style={{ flex: 1, padding: '1rem 1.2rem', borderRadius: '16px' }} />
              <button type="submit" disabled={saving || !newPlanTitle.trim()} style={{ background: 'var(--accent-pink)', color: 'white', border: 'none', borderRadius: '16px', padding: '0 1.2rem', fontWeight: 600, cursor: 'pointer', fontSize: '1.2rem', boxShadow: '0 4px 15px rgba(255,107,138,0.2)' }}>+</button>
            </form>
          </div>
        </div>
      </div>

      {/* Modal Add Memory */}
      {showAddMemory && (
        <div className="modal-overlay" onClick={() => { setShowAddMemory(false); setMemTitle(''); setMemContent(''); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header"><h2>Nova memória 📝</h2><button className="icon-btn" onClick={() => { setShowAddMemory(false); setMemTitle(''); setMemContent(''); }}>✕</button></div>
            <form onSubmit={addMemory}>
              <div className="modal-input-group"><label>Categoria</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select className="modal-input" value={memCategoryId} onChange={(e) => setMemCategoryId(e.target.value)} style={{ flex: 1 }}>
                    {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>))}
                  </select>
                  <button type="button" className="icon-btn" onClick={() => { setShowAddMemory(false); setShowAddCategory(true); }} title="Criar nova categoria" style={{ flexShrink: 0 }}>✨</button>
                </div>
              </div>
              <div className="modal-input-group"><label>O que você quer lembrar?</label><input type="text" className="modal-input" placeholder="Ex: Marca de chocolate favorita" value={memTitle} onChange={(e) => setMemTitle(e.target.value)} required autoFocus /></div>
              <div className="modal-input-group"><label>Detalhe / Resposta</label><input type="text" className="modal-input" placeholder="Ex: Lindt e Cacau Show 🍫" value={memContent} onChange={(e) => setMemContent(e.target.value)} /></div>
              <button type="submit" className="modal-btn" disabled={saving || !memTitle.trim()}>{saving ? 'Salvando...' : 'Salvar 💖'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Category */}
      {showAddCategory && (
        <div className="modal-overlay" onClick={() => { setShowAddCategory(false); setShowAddMemory(true); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header"><h2>Nova categoria ✨</h2><button className="icon-btn" onClick={() => { setShowAddCategory(false); setShowAddMemory(true); }}>✕</button></div>
            <form onSubmit={addCategory}>
              <div className="modal-input-group"><label>Emoji</label>
                <div className="color-picker-grid">
                  {EMOJI_OPTIONS.map((em, i) => (
                    <div key={`${em}-${i}`} className={`color-swatch ${newCatEmoji === em ? 'active' : ''}`} style={{ backgroundColor: '#FFF5F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }} onClick={() => setNewCatEmoji(em)}>{em}</div>
                  ))}
                </div>
              </div>
              <div className="modal-input-group"><label>Nome da categoria</label><input type="text" className="modal-input" placeholder="Ex: Chocolates, Sonhos, Favoritos..." value={newCatName} onChange={(e) => setNewCatName(e.target.value)} required autoFocus /></div>
              <button type="submit" className="modal-btn" disabled={saving || !newCatName.trim()}>{saving ? 'Criando...' : 'Criar 💖'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Memory */}
      {showEditMemory && (
        <div className="modal-overlay" onClick={() => { setShowEditMemory(false); setMemTitle(''); setMemContent(''); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header"><h2>Editar ✏️</h2><button className="icon-btn" onClick={() => { setShowEditMemory(false); setMemTitle(''); setMemContent(''); }}>✕</button></div>
            <form onSubmit={saveEditMemory}>
              <div className="modal-input-group"><label>Categoria</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select className="modal-input" value={memCategoryId} onChange={(e) => setMemCategoryId(e.target.value)} style={{ flex: 1 }}>
                    {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.emoji} {cat.name}</option>))}
                  </select>
                </div>
              </div>
              <div className="modal-input-group"><label>O que você quer lembrar?</label><input type="text" className="modal-input" placeholder="Ex: Marca de chocolate favorita" value={memTitle} onChange={(e) => setMemTitle(e.target.value)} required autoFocus /></div>
              <div className="modal-input-group"><label>Detalhe / Resposta</label><input type="text" className="modal-input" placeholder="Ex: Lindt e Cacau Show 🍫" value={memContent} onChange={(e) => setMemContent(e.target.value)} /></div>
              <button type="submit" className="modal-btn" disabled={saving || !memTitle.trim()}>{saving ? 'Salvando...' : 'Atualizar 💖'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Person */}
      {showEditPerson && (
        <div className="modal-overlay" onClick={() => setShowEditPerson(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header"><h2>Editar ✏️</h2><button className="icon-btn" onClick={() => setShowEditPerson(false)}>✕</button></div>
            <form onSubmit={saveEdit}>
              <div className="modal-input-group"><label>Nome</label><input type="text" className="modal-input" value={editName} onChange={(e) => setEditName(e.target.value)} required /></div>
              <div className="modal-input-group"><label>Apelido carinhoso</label><input type="text" className="modal-input" placeholder="Ex: Mozão, Lili..." value={editNickname} onChange={(e) => setEditNickname(e.target.value)} /></div>
              <div className="modal-input-group"><label>Quem é essa pessoa?</label>
                <select className="modal-input" value={editRelationship} onChange={(e) => setEditRelationship(e.target.value)}>
                  {RELATIONSHIPS.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
                </select>
              </div>
              <div className="modal-input-group"><label>Data de Nascimento</label><input type="date" className="modal-input" value={editBirthdate} onChange={(e) => setEditBirthdate(e.target.value)} />
                {editBirthdate && <p style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: 'var(--accent-pink)', fontWeight: 600, marginLeft: '0.3rem' }}>{getZodiacSign(editBirthdate).emoji} {getZodiacSign(editBirthdate).sign}</p>}
              </div>
              <div className="modal-input-group"><label>Anotação rápida</label><input type="text" className="modal-input" placeholder="Ex: Ama girassóis 🌻" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} /></div>
              <div className="modal-input-group"><label>Cor do cartão</label>
                <div className="color-picker-grid">{CARD_COLORS.map((c) => (<div key={c} className={`color-swatch ${editColor === c ? 'active' : ''}`} style={{ backgroundColor: c }} onClick={() => setEditColor(c)} />))}</div>
              </div>
              <button type="submit" className="modal-btn" disabled={saving || !editName.trim()}>{saving ? 'Salvando...' : 'Atualizar 💖'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => { await supabase.auth.signOut(); setSession(null); setSelectedPerson(null); };

  if (loading) return <div className="auth-page"><h1 className="auth-logo">Memora 💕</h1><p className="auth-subtitle">Carregando...</p></div>;
  if (!session) return <AuthPage onAuth={() => { }} />;
  if (selectedPerson) return <PersonDetail person={selectedPerson} onBack={() => setSelectedPerson(null)} user={session.user} />;
  return <Dashboard user={session.user} onSelectPerson={(p) => setSelectedPerson(p)} onLogout={handleLogout} />;
}

export default App;
