import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import {
  Users,
  Calendar,
  Plus,
  Clock,
  Trash2,
  Edit2,
  Phone,
  Mail,
  UserCheck,
  X
} from 'lucide-react';

export default function AdminEmployees() {
  const { token } = useAuth();
  const { branding } = useBranding();

  // Tabs: 'schedules' (Kalender Mingguan) | 'employees' (Daftar Staff)
  const [activeTab, setActiveTab] = useState('schedules');

  const [employees, setEmployees] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Employee Modal
  const [empModalOpen, setEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState('Kasir');
  const [empPhone, setEmpPhone] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [savingEmp, setSavingEmp] = useState(false);

  // Schedule Modal
  const [schModalOpen, setSchModalOpen] = useState(false);
  const [schEmployeeId, setSchEmployeeId] = useState('');
  const [schDay, setSchDay] = useState('Senin');
  const [schStartTime, setSchStartTime] = useState('08:00');
  const [schEndTime, setSchEndTime] = useState('16:00');
  const [schNotes, setSchNotes] = useState('');
  const [savingSch, setSavingSch] = useState(false);

  const fetchData = async () => {
    try {
      const [empRes, schRes] = await Promise.all([
        fetch('/api/employees', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/schedules', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (empRes.ok) {
        const emps = await empRes.json();
        setEmployees(emps);
        if (emps.length > 0 && !schEmployeeId) setSchEmployeeId(emps[0].id);
      }
      if (schRes.ok) setSchedules(await schRes.json());
    } catch (err) {
      console.error('Failed to load employee data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Employee CRUD
  const openAddEmpModal = () => {
    setEditingEmp(null);
    setEmpName('');
    setEmpRole('Kasir');
    setEmpPhone('');
    setEmpEmail('');
    setEmpModalOpen(true);
  };

  const openEditEmpModal = (emp) => {
    setEditingEmp(emp);
    setEmpName(emp.name);
    setEmpRole(emp.role);
    setEmpPhone(emp.phone || '');
    setEmpEmail(emp.email || '');
    setEmpModalOpen(true);
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    setSavingEmp(true);
    try {
      const url = editingEmp ? `/api/employees/${editingEmp.id}` : '/api/employees';
      const method = editingEmp ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: empName,
          role: empRole,
          phone: empPhone,
          email: empEmail
        })
      });

      if (res.ok) {
        setEmpModalOpen(false);
        fetchData();
      }
    } catch (err) {
      alert('Gagal menyimpan karyawan.');
    } finally {
      setSavingEmp(false);
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (!confirm('Hapus karyawan ini?')) return;
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (err) {
      alert('Gagal menghapus karyawan.');
    }
  };

  // Schedule CRUD
  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    setSavingSch(true);
    try {
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          employee_id: schEmployeeId,
          day_of_week: schDay,
          start_time: schStartTime,
          end_time: schEndTime,
          notes: schNotes
        })
      });

      if (res.ok) {
        setSchModalOpen(false);
        setSchNotes('');
        fetchData();
      }
    } catch (err) {
      alert('Gagal menyimpan jadwal.');
    } finally {
      setSavingSch(false);
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!confirm('Hapus jadwal shift ini?')) return;
    try {
      const res = await fetch(`/api/schedules/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (err) {
      alert('Gagal menghapus jadwal.');
    }
  };

  const daysOfWeek = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2.5">
              <Users size={26} className="text-amber-800" />
              <span>Jadwal Karyawan & Manajemen Staff</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Atur daftar staf (Barista, Kasir, Dapur, Waiter) dan kelola jadwal shift kerja mingguan.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSchModalOpen(true)}
              className="px-3.5 py-2.5 bg-white border border-gray-300 text-gray-800 rounded-xl text-xs font-bold shadow-xs hover:bg-gray-50 transition flex items-center gap-1.5"
            >
              <Calendar size={15} />
              <span>Tambah Jadwal Shift</span>
            </button>

            <button
              onClick={openAddEmpModal}
              className="px-4 py-2.5 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
              style={{ backgroundColor: branding?.primary_color || '#78350F' }}
            >
              <Plus size={16} />
              <span>Tambah Karyawan</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-gray-200/70 p-1 rounded-2xl text-xs font-bold self-start w-fit">
          <button
            onClick={() => setActiveTab('schedules')}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === 'schedules'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Kalender Shift Mingguan
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === 'employees'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Daftar Karyawan ({employees.length})
          </button>
        </div>

        {/* ============================================================= */}
        {/* TAB 1: KALENDER SHIFT MINGGUAN */}
        {/* ============================================================= */}
        {activeTab === 'schedules' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-amber-800" />
              <span>Kalender Jadwal Shift Kerja Cafe</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              {daysOfWeek.map((day) => {
                const daySchedules = schedules.filter(s => s.day_of_week === day);
                return (
                  <div key={day} className="bg-gray-50 rounded-2xl p-3 border border-gray-100 flex flex-col justify-between">
                    <div>
                      <div className="pb-2 mb-2 border-b border-gray-200 flex items-center justify-between">
                        <span className="font-extrabold text-xs text-gray-900 uppercase">
                          {day}
                        </span>
                        <span className="text-[10px] bg-white px-1.5 py-0.5 rounded-md font-bold text-gray-500 border border-gray-200">
                          {daySchedules.length}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {daySchedules.map((sch) => (
                          <div
                            key={sch.id}
                            className="p-2.5 bg-white rounded-xl border border-gray-200/80 shadow-2xs relative group"
                          >
                            <p className="font-bold text-xs text-gray-900 leading-tight">
                              {sch.employee_name}
                            </p>
                            <span className="text-[10px] text-amber-800 font-semibold block">
                              {sch.employee_role}
                            </span>
                            <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-1 font-mono">
                              <Clock size={10} />
                              <span>{sch.start_time} - {sch.end_time}</span>
                            </div>
                            {sch.notes && (
                              <p className="text-[9px] text-gray-400 italic mt-0.5">
                                {sch.notes}
                              </p>
                            )}

                            <button
                              onClick={() => handleDeleteSchedule(sch.id)}
                              className="hidden group-hover:block absolute top-1 right-1 p-1 text-gray-300 hover:text-rose-600 rounded"
                              title="Hapus Shift"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                        {daySchedules.length === 0 && (
                          <p className="text-[11px] text-gray-400 italic text-center py-4">Libur / Kosong</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 2: DAFTAR KARYAWAN */}
        {/* ============================================================= */}
        {activeTab === 'employees' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <UserCheck size={18} className="text-amber-800" />
              <span>Daftar Karyawan & Staf Cafe</span>
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 uppercase tracking-wider font-bold">
                    <th className="pb-3">Nama Lengkap</th>
                    <th className="pb-3">Posisi / Role</th>
                    <th className="pb-3">Kontak Telepon</th>
                    <th className="pb-3">Email</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50 transition">
                      <td className="py-3 font-bold text-gray-900">{emp.name}</td>
                      <td className="py-3">
                        <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 font-bold text-[11px] border border-amber-200">
                          {emp.role}
                        </span>
                      </td>
                      <td className="py-3 text-gray-600 flex items-center gap-1.5">
                        <Phone size={13} className="text-gray-400" />
                        <span>{emp.phone || '-'}</span>
                      </td>
                      <td className="py-3 text-gray-600">
                        {emp.email || '-'}
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Aktif
                        </span>
                      </td>
                      <td className="py-3 text-right space-x-1">
                        <button
                          onClick={() => openEditEmpModal(emp)}
                          className="p-1.5 text-gray-500 hover:text-gray-800 rounded-lg hover:bg-gray-100"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(emp.id)}
                          className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Employee Modal */}
      {empModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-200">
            <h2 className="text-base font-bold text-gray-900 mb-3">
              {editingEmp ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
            </h2>
            <form onSubmit={handleSaveEmployee} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Nama Karyawan:</label>
                <input
                  type="text"
                  required
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  placeholder="Misal: Dimas Pratama"
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Posisi / Role:</label>
                <select
                  value={empRole}
                  onChange={(e) => setEmpRole(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-semibold"
                >
                  <option value="Head Kitchen / Chef">Head Kitchen / Chef</option>
                  <option value="Senior Barista">Senior Barista</option>
                  <option value="Junior Barista">Junior Barista</option>
                  <option value="Kasir Utama">Kasir Utama</option>
                  <option value="Kasir">Kasir</option>
                  <option value="Waiter & Floor">Waiter & Floor</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Nomor WhatsApp / HP:</label>
                <input
                  type="text"
                  value={empPhone}
                  onChange={(e) => setEmpPhone(e.target.value)}
                  placeholder="0812-xxxx-xxxx"
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Email (Opsional):</label>
                <input
                  type="email"
                  value={empEmail}
                  onChange={(e) => setEmpEmail(e.target.value)}
                  placeholder="staf@senja.cafe"
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEmpModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEmp}
                  className="flex-1 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold shadow-md"
                >
                  {savingEmp ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {schModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-200">
            <h2 className="text-base font-bold text-gray-900 mb-3">Tambah Jadwal Shift Kerja</h2>
            <form onSubmit={handleSaveSchedule} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Pilih Karyawan:</label>
                <select
                  value={schEmployeeId}
                  onChange={(e) => setSchEmployeeId(e.target.value)}
                  required
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-semibold"
                >
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Hari Kerja:</label>
                <select
                  value={schDay}
                  onChange={(e) => setSchDay(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-semibold"
                >
                  {daysOfWeek.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Jam Mulai:</label>
                  <input
                    type="time"
                    required
                    value={schStartTime}
                    onChange={(e) => setSchStartTime(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Jam Selesai:</label>
                  <input
                    type="time"
                    required
                    value={schEndTime}
                    onChange={(e) => setSchEndTime(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Keterangan Shift (Opsional):</label>
                <input
                  type="text"
                  value={schNotes}
                  onChange={(e) => setSchNotes(e.target.value)}
                  placeholder="Misal: Shift Pagi Dapur"
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSchModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingSch}
                  className="flex-1 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold shadow-md"
                >
                  {savingSch ? 'Menyimpan...' : 'Simpan Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
