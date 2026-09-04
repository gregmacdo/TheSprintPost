"use client";

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthHeader from '../../components/AuthHeader';
import Cropper from 'react-easy-crop';

// --- CANVAS HELPER FUNCTION TO CROP & RESIZE THE IMAGE ---
const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

const getCroppedImg = async (imageSrc, pixelCrop) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  const TARGET_SIZE = 512;
  canvas.width = TARGET_SIZE;
  canvas.height = TARGET_SIZE;

  // DIGITAL COOKIE CUTTER
  ctx.beginPath();
  ctx.arc(TARGET_SIZE / 2, TARGET_SIZE / 2, TARGET_SIZE / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    TARGET_SIZE,
    TARGET_SIZE
  );

  return new Promise((resolve) => {
    // SAVED AS PNG FOR TRANSPARENT CORNERS
    canvas.toBlob((file) => resolve(file), 'image/png');
  });
};
// ------------------------------------------------

export default function ProfilePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState('Prefer not to say');
  const [isOver40, setIsOver40] = useState(false);
  const [isClydesdale, setIsClydesdale] = useState(false);
  
  const [originalAvatar, setOriginalAvatar] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarHistory, setAvatarHistory] = useState([]);

  // Cropper State
  const [imageSrc, setImageSrc] = useState(null); 
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isCropping) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isCropping]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      
      const currentUser = session.user;
      setUser(currentUser);
      
      const meta = currentUser.user_metadata || {};
      setDisplayName(meta.display_name || '');
      setGender(meta.gender || 'Prefer not to say');
      setIsOver40(meta.is_over_40 || false);
      setIsClydesdale(meta.is_clydesdale || false);
      
      setOriginalAvatar(meta.avatar_url || null);
      setAvatarUrl(meta.avatar_url || null);
      
      setLoading(false);
    };

    fetchUser();
  }, [router]);

  const onFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result);
        setIsCropping(true); 
      });
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleUploadCrop = async () => {
    try {
      setMessage('');
      setIsCropping(false); 
      
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const fileName = `${user.id}-${Math.random()}.png`; 

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      if (avatarUrl) setAvatarHistory((prev) => [...prev, avatarUrl]);
      
      setAvatarUrl(publicUrl);
      setImageSrc(null); 
      setMessage('Avatar cropped & uploaded! Click Save Profile to apply.');
      
    } catch (error) {
      alert(error.message);
      setImageSrc(null);
    }
  };

  const generateRandomAvatar = () => {
    if (avatarUrl) {
      setAvatarHistory((prev) => [...prev, avatarUrl]);
    }
    const seed = Math.random().toString(36).substring(7);
    
    // Back to 10.x, back to Critters, and no background parameter!
    const newAvatar = `https://api.dicebear.com/10.x/critters/svg?seed=${seed}`;
    setAvatarUrl(newAvatar);
  };

  const undoAvatar = () => {
    if (avatarHistory.length > 0) {
      const newHistory = [...avatarHistory];
      const previousAvatar = newHistory.pop();
      setAvatarHistory(newHistory); 
      setAvatarUrl(previousAvatar); 
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const { data, error } = await supabase.auth.updateUser({
      data: {
        display_name: displayName,
        gender: gender,
        is_over_40: isOver40,
        is_clydesdale: isClydesdale,
        avatar_url: avatarUrl
      }
    });

    if (error) {
      setMessage(`Error: ${error.message}`);
      setSaving(false);
      return;
    }

    await supabase.from('sprints').update({
      display_name: displayName,
      athlete_gender: gender,
      athlete_over_40: isOver40,
      athlete_clydesdale: isClydesdale,
      athlete_avatar: avatarUrl
    }).eq('user_id', user.id);

    setOriginalAvatar(avatarUrl); 
    setAvatarHistory([]); 
    setMessage('Profile updated successfully! All your past sprints have been updated.');
    setUser(data.user);
    setSaving(false);
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-900 relative">
      
      {isCropping && mounted && createPortal(
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: '#000000',
          zIndex: 2147483647, 
          display: 'flex',
          flexDirection: 'column',
          touchAction: 'none'
        }}>
          
          <div style={{ 
            padding: '16px', 
            paddingTop: '48px', 
            backgroundColor: '#111827', 
            color: 'white', 
            textAlign: 'center', 
            flexShrink: 0 
          }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '18px', margin: 0 }}>Crop Your Avatar</h3>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0 0' }}>Pinch to zoom, drag to move.</p>
          </div>
          
          <div style={{ position: 'relative', flex: 1, width: '100%', overflow: 'hidden' }}>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
          
          <div style={{
            backgroundColor: '#ffffff',
            padding: '24px',
            paddingBottom: '40px',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            flexShrink: 0,
            boxShadow: '0 -10px 25px rgba(0,0,0,0.5)',
            position: 'relative',
            zIndex: 10
          }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#6b7280' }}>Zoom</span>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e) => setZoom(e.target.value)}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '16px' }}>
              <button 
                onClick={() => { setIsCropping(false); setImageSrc(null); setZoom(1); }} 
                style={{
                  flex: 1,
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  padding: '16px',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleUploadCrop} 
                style={{
                  flex: 1,
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  padding: '16px',
                  borderRadius: '12px',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Save Crop
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="max-w-3xl mx-auto space-y-8">
        <AuthHeader />

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 md:p-8 bg-gray-900 text-white">
            <Link href="/" className="text-gray-400 hover:text-white text-sm font-medium mb-2 inline-block transition-colors">
              &larr; Back to Dashboard
            </Link>
            <h2 className="text-2xl font-bold">Athlete Profile</h2>
          </div>

          <div className="p-6 md:p-8">
            {message && (
              <div className={`mb-6 p-4 rounded-xl text-sm font-medium border ${message.includes('Error') ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                {message}
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-8">
              
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-8 border-b border-gray-100 text-center sm:text-left">
                
                {avatarUrl && avatarUrl !== originalAvatar && (
                  <div className="w-24 h-24 rounded-full bg-transparent border border-gray-200 shadow-sm overflow-hidden flex-shrink-0 flex items-center justify-center mx-auto sm:mx-0">
                    <img src={avatarUrl} alt="New Avatar Preview" className="w-full h-full object-cover" />
                  </div>
                )}
                
                <div className="w-full">
                  <label className="block text-sm font-bold mb-2">Change Profile Picture</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={onFileChange}
                    className="block w-full max-w-xs mx-auto sm:mx-0 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-gray-100 file:text-black hover:file:bg-gray-200 cursor-pointer"
                  />
                  
                  <div className="mt-4 flex items-center gap-3 justify-center sm:justify-start flex-wrap">
                    <span className="text-sm text-gray-400 font-medium">or</span>
                    <div className="flex items-center gap-2">
                      {avatarHistory.length > 0 && (
                        <button 
                          type="button" 
                          onClick={undoAvatar}
                          className="text-sm bg-gray-100 hover:bg-gray-200 text-black px-4 py-2 rounded-full font-bold transition-colors shadow-sm"
                        >
                          ↩️ Undo
                        </button>
                      )}
                      <button 
                        type="button" 
                        onClick={generateRandomAvatar}
                        className="text-sm bg-gray-100 hover:bg-gray-200 text-black px-4 py-2 rounded-full font-bold transition-colors shadow-sm"
                      >
                        🎲 Generate Random
                      </button>
                    </div>
                  </div>
                  
                  {avatarUrl !== originalAvatar && (
                    <p className="text-xs text-orange-600 font-bold mt-4">Previewing new avatar. Don't forget to save!</p>
                  )}
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold mb-2">Display Name</label>
                  <input 
                    type="text" 
                    required 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black bg-gray-50 focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Gender Category</label>
                  <select 
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-black bg-gray-50 focus:bg-white transition-colors appearance-none cursor-pointer"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                <div className="flex flex-col gap-3 bg-gray-50 p-5 rounded-xl border border-gray-100">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isOver40}
                      onChange={(e) => setIsOver40(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                    />
                    <span className="text-sm font-bold">Masters (40+ years old)</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer mt-2">
                    <input 
                      type="checkbox" 
                      checked={isClydesdale}
                      onChange={(e) => setIsClydesdale(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black"
                    />
                    <div>
                      <span className="text-sm font-bold block">Clydesdale / Athena</span>
                      <span className="text-xs text-gray-500">Male 200+ lbs / Female 165+ lbs</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="bg-black text-white px-8 py-3.5 rounded-xl font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 shadow-sm w-full sm:w-auto"
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </main>
  );
}
