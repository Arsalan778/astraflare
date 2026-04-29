import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '@api/axios';

import { Users, UserPlus, Search, Mail, Phone, ExternalLink, Loader2 } from 'lucide-react';

const UPLOADS_URL = `${import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'}/uploads/`;



export default function ViewMembers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await api.get('/members');
        setMembers(response.data);
      } catch (error) {

        console.error('Error fetching members:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="text-orange-500" />
            Team Members
          </h1>
          <p className="text-slate-500 mt-1">Manage and view your wildfire response team</p>
        </div>
        <Link
          to="/members/add"
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-bold shadow-lg shadow-orange-500/20 hover:from-orange-400 hover:to-red-500 transition-all self-start"
        >
          <UserPlus size={18} />
          <span>Add Member</span>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Search by name, role, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="text-orange-500 animate-spin mb-4" size={48} />
          <p className="text-slate-500 font-medium tracking-wider uppercase text-sm">Loading team roster...</p>
        </div>
      ) : filteredMembers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredMembers.map((member) => (
            <div
              key={member._id}
              className="group bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/5"
            >
              <div className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="relative w-24 h-24 mb-4">
                    {member.profileImage ? (
                      <img
                        src={`${UPLOADS_URL}${member.profileImage}`}
                        alt={member.name}
                        className="w-full h-full object-cover rounded-2xl border-2 border-slate-800 group-hover:border-orange-500/30 transition-colors"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 border-2 border-slate-800 group-hover:border-slate-700 transition-colors">
                        <Users size={32} />
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-4 border-slate-950" />
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-orange-400 transition-colors">
                    {member.name}
                  </h3>
                  <p className="text-sm font-medium text-slate-400 mb-4">{member.role}</p>

                  <div className="w-full space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 justify-center">
                      <Mail size={12} className="text-slate-600" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    {member.contact && (
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 justify-center">
                        <Phone size={12} className="text-slate-600" />
                        <span>{member.contact}</span>
                      </div>
                    )}
                  </div>

                  <Link
                    to={`/members/${member._id}`}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all border border-slate-700/50"
                  >
                    View Details
                    <ExternalLink size={14} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-900/30 border border-slate-800/50 border-dashed rounded-3xl">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-600">
            <Users size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-400">No members found</h3>
          <p className="text-slate-500 mt-1">Try adjusting your search or add a new team member.</p>
          <Link
            to="/members/add"
            className="inline-flex items-center gap-2 mt-6 text-orange-500 hover:text-orange-400 font-bold transition-colors"
          >
            <UserPlus size={18} />
            <span>Add your first member</span>
          </Link>
        </div>
      )}
    </div>
  );
}
