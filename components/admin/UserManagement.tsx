import React, { useState, useEffect } from 'react';
import { useUser } from "@/lib/hooks/useUser";
import { useRouter } from 'next/router';
import { 
  Users, 
  Mail, 
  Activity, 
  Calendar, 
  Search, 
  Filter,
  Send,
  UserCheck,
  Clock,
  MessageSquare,
  ChevronDown,
  Settings,
  Trash2,
  Eye,
  History
} from 'lucide-react';

interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  lastActive: string | null;
  totalSessions: number;
  floCatStyle: string | null;
  preferredName: string | null;
  timezone: string | null;
  activeWidgets: string[] | null;
}

interface UserStats {
  totalUsers: number;
  activeUsers30Days: number;
  registrationStats: { date: string; count: number }[];
}

interface CommunicationModal {
  isOpen: boolean;
  type: 'individual' | 'group' | 'broadcast';
  selectedUsers: User[];
}

const UserManagement: React.FC = () => {
  const { user, isLoading } = useUser();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [communicationModal, setCommunicationModal] = useState<CommunicationModal>({
    isOpen: false,
    type: 'individual',
    selectedUsers: []
  });
  const [emailForm, setEmailForm] = useState({
    subject: '',
    message: '',
    messageType: 'notification' as 'announcement' | 'notification' | 'support' | 'update',
    signature: 'The FloHub Team'
  });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [messageHistory, setMessageHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Check authorization
  useEffect(() => {
    if (typeof window !== 'undefined' && user?.primaryEmail !== 'amascaro08@gmail.com') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Fetch users data
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/users');
        if (!response.ok) throw new Error('Failed to fetch users');
        const data = await response.json();
        setUsers(data.users);
        setFilteredUsers(data.users);
        setStats(data.stats);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    if (typeof window !== 'undefined' && user?.primaryEmail === 'amascaro08@gmail.com') {
      fetchUsers();
    }
  }, [user]);

  // Fetch message history
  const fetchMessageHistory = async () => {
    try {
      const response = await fetch('/api/admin/messages');
      if (response.ok) {
        const data = await response.json();
        setMessageHistory(data.messages);
      }
    } catch (error) {
      console.error('Error fetching message history:', error);
    }
  };

  // Filter users based on search and activity
  useEffect(() => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.preferredName && u.preferredName.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Activity filter
    if (filterActive !== 'all') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      filtered = filtered.filter(u => {
        const lastActive = u.lastActive ? new Date(u.lastActive) : null;
        const isActive = lastActive && lastActive > thirtyDaysAgo;
        return filterActive === 'active' ? isActive : !isActive;
      });
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, filterActive]);

  const handleUserSelect = (userEmail: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userEmail)) {
      newSelected.delete(userEmail);
    } else {
      newSelected.add(userEmail);
    }
    setSelectedUsers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.email)));
    }
  };

  const openCommunicationModal = (type: 'individual' | 'group' | 'broadcast', targetUsers?: User[]) => {
    let selectedUsersForModal: User[] = [];
    
    if (type === 'individual' && targetUsers) {
      selectedUsersForModal = targetUsers;
    } else if (type === 'group') {
      selectedUsersForModal = users.filter(u => selectedUsers.has(u.email));
    } else if (type === 'broadcast') {
      selectedUsersForModal = users;
    }

    setCommunicationModal({
      isOpen: true,
      type,
      selectedUsers: selectedUsersForModal
    });
  };

  const sendEmail = async () => {
    setSendingEmail(true);
    try {
      const response = await fetch('/api/admin/communicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: communicationModal.type,
          recipients: communicationModal.selectedUsers.map(u => u.email),
          subject: emailForm.subject,
          message: emailForm.message,
          messageType: emailForm.messageType,
          signature: emailForm.signature
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        alert(`Email sent successfully to ${result.details.sent} recipients!`);
        setCommunicationModal({ isOpen: false, type: 'individual', selectedUsers: [] });
        setEmailForm({ subject: '', message: '', messageType: 'notification', signature: 'The FloHub Team' });
        
        // Refresh message history if it's currently shown
        if (showHistory) {
          fetchMessageHistory();
        }
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email');
    } finally {
      setSendingEmail(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const formatLastActive = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading || typeof window === 'undefined') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (user?.primaryEmail !== 'amascaro08@gmail.com') {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex justify-end items-center">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowHistory(!showHistory);
              if (!showHistory) fetchMessageHistory();
            }}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700"
          >
            <History className="w-4 h-4" />
            Message History
          </button>
          <button
            onClick={() => openCommunicationModal('broadcast')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <Mail className="w-4 h-4" />
            Broadcast Message
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-medium">Total Users</h3>
            </div>
            <p className="text-3xl font-bold">{stats.totalUsers}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-medium">Active Users (30d)</h3>
            </div>
            <p className="text-3xl font-bold">{stats.activeUsers30Days}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-medium">Selected Users</h3>
            </div>
            <p className="text-3xl font-bold">{selectedUsers.size}</p>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              />
            </div>

            {/* Activity Filter */}
            <select
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value as 'all' | 'active' | 'inactive')}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700"
            >
              <option value="all">All Users</option>
              <option value="active">Active (30d)</option>
              <option value="inactive">Inactive (30d)</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleSelectAll}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500"
            >
              {selectedUsers.size === filteredUsers.length ? 'Deselect All' : 'Select All'}
            </button>
            {selectedUsers.size > 0 && (
              <button
                onClick={() => openCommunicationModal('group')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Email Selected ({selectedUsers.size})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Message History */}
      {showHistory && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <History className="w-5 h-5" />
              Recent Messages
            </h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {messageHistory.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No messages sent yet</div>
            ) : (
              <div className="space-y-3 p-4">
                {messageHistory.map((msg) => (
                  <div key={msg.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          msg.type === 'broadcast' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          msg.type === 'group' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {msg.type}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          msg.messageType === 'announcement' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                          msg.messageType === 'support' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {msg.messageType}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(msg.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="font-medium text-sm">{msg.subject}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Sent to {msg.recipientCount} recipient{msg.recipientCount !== 1 ? 's' : ''} • 
                      <span className={msg.success ? 'text-green-600' : 'text-red-600'}>
                        {msg.success ? 'Success' : 'Failed'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium">User</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Joined</th>
                <th className="px-4 py-3 text-left font-medium">Last Active</th>
                <th className="px-4 py-3 text-left font-medium">Sessions</th>
                <th className="px-4 py-3 text-left font-medium">FloCat Style</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.email)}
                      onChange={() => handleUserSelect(user.email)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium">{user.name}</div>
                      {user.preferredName && (
                        <div className="text-sm text-gray-500">({user.preferredName})</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{user.email}</td>
                  <td className="px-4 py-3 text-sm">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center gap-1 ${
                      user.lastActive && new Date(user.lastActive) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                        ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      <Clock className="w-3 h-3" />
                      {formatLastActive(user.lastActive)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{user.totalSessions}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-600 rounded text-xs">
                      {user.floCatStyle || 'default'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openCommunicationModal('individual', [user])}
                        className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900 rounded"
                        title="Send Email"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Communication Modal */}
      {communicationModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Send Message to {communicationModal.selectedUsers.length} User(s)
                </h3>
                <button
                  onClick={() => setCommunicationModal({ isOpen: false, type: 'individual', selectedUsers: [] })}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>

              {/* Recipients */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Recipients:</label>
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg max-h-32 overflow-y-auto">
                  {communicationModal.selectedUsers.map(user => (
                    <div key={user.email} className="text-sm">{user.name} ({user.email})</div>
                  ))}
                </div>
              </div>

              {/* Message Type */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Message Type:</label>
                <select
                  value={emailForm.messageType}
                  onChange={(e) => setEmailForm({...emailForm, messageType: e.target.value as any})}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700"
                >
                  <option value="notification">Notification</option>
                  <option value="announcement">Announcement</option>
                  <option value="support">Support Message</option>
                  <option value="update">Update</option>
                </select>
              </div>

              {/* Subject */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Subject:</label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({...emailForm, subject: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700"
                  placeholder="Enter email subject"
                />
              </div>

              {/* Message */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Message:</label>
                <textarea
                  value={emailForm.message}
                  onChange={(e) => setEmailForm({...emailForm, message: e.target.value})}
                  rows={6}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700"
                  placeholder="Enter your message"
                />
              </div>

              {/* Signature */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Email Signature:</label>
                <select
                  value={emailForm.signature}
                  onChange={(e) => setEmailForm({...emailForm, signature: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700"
                >
                  <option value="The FloHub Team">The FloHub Team</option>
                  <option value="Alvaro - Founder">Alvaro - Founder</option>
                  <option value="Alvaro Mascaro">Alvaro Mascaro</option>
                  <option value="FloHub Support Team">FloHub Support Team</option>
                  <option value="Custom">Custom...</option>
                </select>
                {emailForm.signature === 'Custom' && (
                  <input
                    type="text"
                    value=""
                    onChange={(e) => setEmailForm({...emailForm, signature: e.target.value})}
                    className="w-full mt-2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700"
                    placeholder="Enter custom signature"
                  />
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setCommunicationModal({ isOpen: false, type: 'individual', selectedUsers: [] })}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={sendEmail}
                  disabled={sendingEmail || !emailForm.subject || !emailForm.message}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {sendingEmail ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;