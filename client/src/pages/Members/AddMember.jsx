import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@api/axios';

import { UserPlus, ArrowLeft, Upload, Loader2, Save } from 'lucide-react';

const UPLOADS_URL = `${import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'}/uploads/`;


export default function AddMember() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    email: '',
    contact: '',
    additionalDetails: '',
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const isEdit = !!id;

  useEffect(() => {
    if (isEdit) {
      const fetchMember = async () => {
        setFetching(true);
        try {
          const response = await api.get(`/members/${id}`);
          const { name, role, email, contact, additionalDetails, profileImage } = response.data;

          setFormData({ name, role, email, contact: contact || '', additionalDetails: additionalDetails || '' });
          if (profileImage) {
            setImagePreview(`${UPLOADS_URL}${profileImage}`);
          }
        } catch (error) {
          console.error('Error fetching member for edit:', error);
          alert('Failed to load member data.');
          navigate('/members');
        } finally {
          setFetching(false);
        }
      };
      fetchMember();
    }
  }, [id, isEdit, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const data = new FormData();
    data.append('name', formData.name);
    data.append('role', formData.role);
    data.append('email', formData.email);
    data.append('contact', formData.contact);
    data.append('additionalDetails', formData.additionalDetails);
    if (image) {
      data.append('profileImage', image);
    }

    try {
      if (isEdit) {
        await api.put(`/members/${id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/members', data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      navigate(isEdit ? `/members/${id}` : '/members');
    } catch (error) {
      console.error('Error saving member:', error);
      alert(`Failed to ${isEdit ? 'update' : 'add'} member. Please check the console.`);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="text-orange-500 animate-spin mb-4" size={48} />
        <p className="text-slate-500 font-medium tracking-wider uppercase text-sm">Loading member data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate(isEdit ? `/members/${id}` : '/members')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to {isEdit ? 'Details' : 'Members'}</span>
        </button>
        <h1 className="text-2xl font-bold text-white">{isEdit ? 'Edit Member Profile' : 'Add New Team Member'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Form Fields */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Full Name *</label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Role *</label>
              <input
                type="text"
                name="role"
                required
                value={formData.role}
                onChange={handleChange}
                placeholder="Chief Fire Marshal"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address *</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="john.doe@astraflare.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Contact Info</label>
              <input
                type="text"
                name="contact"
                value={formData.contact}
                onChange={handleChange}
                placeholder="+1 (555) 000-0000"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
              />
            </div>
          </div>

          {/* Right Column: Image and Details */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Profile Photo</label>
              <div className="flex flex-col items-center gap-4 p-4 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/30">
                {imagePreview ? (
                  <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-orange-500/30">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setImage(null);
                        setImagePreview(null);
                      }}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                    >
                      <span className="text-white text-xs font-bold">Change</span>
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                    <Upload size={32} />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="profileImage"
                />
                <label
                  htmlFor="profileImage"
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium cursor-pointer transition-colors"
                >
                  {imagePreview ? 'Replace Photo' : 'Upload Photo'}
                </label>
                <p className="text-[10px] text-slate-500 text-center uppercase tracking-wider">
                  Recommended: Square, JPG or PNG, max 5MB
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Additional Details</label>
              <textarea
                name="additionalDetails"
                rows={4}
                value={formData.additionalDetails}
                onChange={handleChange}
                placeholder="Tell us more about this member..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all resize-none"
              ></textarea>
            </div>
          </div>
        </div>

        <div className="mt-10 flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate(isEdit ? `/members/${id}` : '/members')}
            className="px-6 py-2.5 border border-slate-700 text-slate-300 rounded-lg font-medium hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-bold shadow-lg shadow-orange-500/20 hover:from-orange-400 hover:to-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : isEdit ? <Save size={18} /> : <UserPlus size={18} />}
            {loading ? (isEdit ? 'Updating...' : 'Adding...') : (isEdit ? 'Update Member' : 'Save Member')}
          </button>
        </div>
      </form>
    </div>
  );
}
