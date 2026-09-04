"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthHeader from '../../components/AuthHeader';
import Cropper from 'react-easy-crop';

// --- CANVAS HELPER FUNCTION TO CROP THE IMAGE ---
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

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((file) => resolve(file), 'image/jpeg');
  });
};
// ------------------------------------------------

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState('Prefer not to say');
  const [isOver40, setIsOver40] = useState(false);
  const [isClydesdale, setIsClydesdale] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);

  // Cropper State
  const [imageSrc, setImageSrc] = useState(null); 
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);

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
      const fileName = `${user.id}-${Math.random()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, croppedBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setAvatarUrl(publicUrl);
      setImageSrc(null); 
      setMessage('Avatar cropped & uploaded! Click Save Profile to apply.');
      
    } catch (error) {
      alert(error.message);
      setImageSrc(null);
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

    setMessage('Profile updated successfully! All your past sprints have been updated.');
    setUser(data.user);
    setSaving(false);
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-900 relative">
      
      {/* THE CROPPER MODAL OVERLAY */}
      {isCropping && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center sm:p-4 touch-none">
          <div className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:rounded-3xl sm:max-w-xl flex flex-col overflow-hidden shadow-2xl">
            
            {/* Header - Forced to top layer */}
            <div className="relative z-50 p-4 sm:p-6 bg-gray-900 text-white text-center shrink-0">
              <h3 className="font-bold text-lg">Crop Your Avatar</h3>
              <p className="text-sm text-gray-400 mt-1">Pinch to zoom, drag to move.</p>
            </div>
            
            {/* Cropper Container - flex-1 and min-h-0 prevents it from pushing buttons off screen */}
            <div className="relative w-full flex-1 min-h-0 bg-black overflow-hidden z-0">
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
                style={{ containerStyle: { width: '100%', height: '100%' } }}
              />
            </div>
            
            {/* Controls - Elevated z-50 prevents the cropper touch layer from blocking taps */}
            <div className="relative z-50 p-4 sm:p-6 space-y-4 sm:space-y-6 shrink-0 bg-white border-t border-gray-100 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)]">
              <div className="flex items-center gap-4">
                <span className="text-sm font-bold text-gray-500">Zoom</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(e.target.value)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                />
              </div>
              <div className="flex gap-4">
                <button onClick={() => { setIsCropping(false); setImageSrc(null); setZoom(1); }} className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors text-sm sm:text-base">Cancel</button>
                <button onClick={handleUploadCrop} className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-sm text-sm sm:text-base">Save Crop</button>
              </div>
            </div>
          </div>
        </div>
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
                <div className="w-24 h-24 rounded-full bg-gray-200 border-4 border-white shadow-lg overflow-hidden flex-shrink-0 flex items-center justify-center mx-auto sm:mx-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">👤</span>
                  )}
                </div>
                <div className="w-full">
                  <label className="block text-sm font-bold mb-2">Profile Picture</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={onFileChange}
                    className="block w-full max-w-xs mx-auto sm:mx-0 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-gray-100 file:text-black hover:file:bg-gray-200 cursor-pointer"
                  />
                  <p className="text-xs text-gray-500 mt-2">Will be cropped into a circle automatically.</p>
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
