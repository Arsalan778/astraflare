import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '@api/axios';

import { ArrowLeft, Mail, Phone, Calendar, Info, Loader2, Users } from 'lucide-react';

const UPLOADS_URL = `${import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'}/uploads/`;



export default function MemberDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMember = async () => {
      try {
        const response = await api.get(`/members/${id}`);
        setMember(response.data);
      } catch (error) {

        console.error('Error fetching member details:', error);
        alert('Failed to load member details.');
        navigate('/members');
      } finally {
        setLoading(false);
      }
    };
    fetchMember();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to remove this member?')) {
      try {
        await api.delete(`/members/${id}`);
        navigate('/members');
      } catch (error) {

        console.error('Error deleting member:', error);
        alert('Failed to delete member.');
      }
    }
  };


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="text-orange-500 animate-spin mb-4" size={48} />
        <p className="text-slate-500 font-medium tracking-wider uppercase text-sm">Retrieving profile...</p>
      </div>
    );
  }

  if (!member) return null;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8">
        <button
          onClick={() => navigate('/members')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back to Team Roster</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 flex flex-col items-center text-center shadow-xl">
            <div className="relative w-40 h-40 mb-6">
              {member.profileImage ? (
                <img
                  src={`${UPLOADS_URL}${member.profileImage}`}
                  alt={member.name}
                  className="w-full h-full object-cover rounded-[2rem] border-4 border-slate-800 shadow-2xl"
                />
              ) : (
                <div className="w-full h-full bg-slate-800 rounded-[2rem] flex items-center justify-center text-slate-500 border-4 border-slate-800">
                  <Users size={64} />
                </div>
              )}
              <span className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full border-8 border-slate-950" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">{member.name}</h1>
            <p className="text-orange-500 font-bold text-sm tracking-wide uppercase">{member.role}</p>
            
            <div className="w-full h-px bg-slate-800 my-6" />
            
            <div className="w-full space-y-4">
              <div className="flex items-center gap-4 text-slate-400">
                <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                  <Mail size={14} className="text-slate-500" />
                </div>
                <span className="text-sm truncate">{member.email}</span>
              </div>
              {member.contact && (
                <div className="flex items-center gap-4 text-slate-400">
                  <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                    <Phone size={14} className="text-slate-500" />
                  </div>
                  <span className="text-sm">{member.contact}</span>
                </div>
              )}
              <div className="flex items-center gap-4 text-slate-400">
                <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                  <Calendar size={14} className="text-slate-500" />
                </div>
                <span className="text-sm">Added on {new Date(member.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-800">
              <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                <Info size={20} className="text-orange-500" />
              </div>
              <h2 className="text-xl font-bold text-white">Additional Information</h2>
            </div>
            
            {member.additionalDetails ? (
              <div className="text-slate-300 leading-relaxed space-y-4">
                {member.additionalDetails.split('\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            ) : (
              <div className="py-8 flex flex-col items-center justify-center text-slate-600">
                <p className="text-sm italic">No additional details provided for this member.</p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <Link
              to={`/members/edit/${id}`}
              className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl hover:bg-slate-800 transition-colors text-center group"
            >
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Actions</p>
              <p className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">Edit Profile</p>
            </Link>
            <button
              onClick={handleDelete}
              className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl hover:bg-red-500/10 hover:border-red-500/30 transition-colors text-center group"
            >
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Danger Zone</p>
              <p className="text-sm font-bold text-red-400 group-hover:text-red-500 transition-colors">Remove Member</p>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
