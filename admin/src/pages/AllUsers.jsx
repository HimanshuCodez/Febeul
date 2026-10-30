import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { backendUrl } from '../App';
import { toast } from 'react-toastify';
import { CalendarRange, X, Users, UserCheck, ShieldCheck, Crown, Search, SlidersHorizontal, Plus, RefreshCw, ChevronLeft, ChevronRight, Gift, LockKeyhole, ShieldOff, Check, CircleAlert, Download } from 'lucide-react';
import useSearchPrefill from '../search/useSearchPrefill';

const buttonClass = 'inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-theme-eae5ed bg-white px-4 py-2.5 text-xs font-medium text-theme-64566e hover:border-theme-d8cbdc hover:bg-theme-faf6fa';
const darkButtonClass = 'inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg border border-theme-2f2633 bg-theme-2f2633 px-4 py-2.5 text-xs font-medium text-white hover:border-theme-49374e hover:bg-theme-49374e';
const badgeClass = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-medium';
const pageButtonClass = 'inline-flex min-h-8 min-w-8 items-center justify-center gap-1 rounded-md border px-2 text-[11px]';
const cellClass = 'flex min-w-0 flex-col items-start gap-1.5 before:text-[10px] before:text-theme-897491 before:content-[attr(data-label)] xl:table-cell xl:border-b xl:border-theme-f3eff6 xl:px-3 xl:py-3.5 xl:align-middle xl:before:hidden';
const emptyClass = 'flex min-h-[270px] flex-col items-center justify-center gap-2.5 border-t border-theme-f3edf6 px-5 py-8 text-center';
const avatarColors = ['border-theme-f1e4ed bg-theme-fbf0f5 text-theme-ab6a89', 'border-theme-e5eded bg-theme-eef5f5 text-theme-6c8286', 'border-theme-f0e9db bg-theme-faf5eb text-theme-95815f', 'border-theme-eae2f4 bg-theme-f3effa text-theme-8b77a1'];
const summaryIcons = { dark: 'bg-white/5 text-theme-e4b0c4', green: 'bg-theme-edf5f0 text-theme-5e8c74', rose: 'bg-theme-fcf0f5 text-theme-b5748e', purple: 'bg-theme-f4eff7 text-theme-9478a4' };
const roleColors = { user: 'bg-theme-f2eff6 text-theme-887095', staff: 'bg-theme-eef1fb text-theme-6e7da4', admin: 'bg-theme-f3ecf9 text-theme-9672ab' };
const hasActiveLuxe = user => user.isLuxeMember && new Date(user.luxeMembershipExpires).getTime() > Date.now();
const csvCell = value => {
  const text = String(value ?? '');
  // Keep customer-entered formulas literal and preserve quotes, commas and newlines.
  const literal = /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${literal.replace(/"/g, '""')}"`;
};

const AllUsers = ({ token }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [grantingLuxeUserId, setGrantingLuxeUserId] = useState(null);
  const luxeRequestRef = useRef(false);
  const dialogRef = useRef(null);
  const modalTriggerRef = useRef(null);
  
  // Modal State
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('staff');
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useSearchPrefill();
  const [roleFilter, setRoleFilter] = useState('all');
  const [membershipFilter, setMembershipFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const permissionOptions = [
    { label: 'Dashboard', path: '/' },
    { label: 'All Users', path: '/allusers' },
    { label: 'Add Items', path: '/add' },
    { label: 'List Items', path: '/list' },
    { label: 'Orders', path: '/orders' },
    { label: 'Refund Requests', path: '/refund-requests' },
    { label: 'Return Requests', path: '/return-requests' },
    { label: 'Exchanges', path: '/exchanges' },
    { label: 'Gift Wraps', path: '/gift-wraps' },
    { label: 'Policy Update', path: '/policy-update' },
    { label: 'Generate Coupon', path: '/coupons' },
    { label: 'Tickets', path: '/tickets' },
    { label: 'Reviews', path: '/reviews' },
    { label: 'Staff Tracking', path: '/staff-tracking' },
    { label: 'User Tracking', path: '/user-tracking' },
    { label: 'CMS', path: '/cms' },
    { label: 'Hero Images', path: '/images' },
    { label: 'Email Marketing', path: '/send-mail' },
    { label: 'Email Templates', path: '/email-templates' },
    { label: 'Maintenance Mode', path: '/maintenance' },
    { label: 'Configurations', path: '/configurations' },
    { label: 'Product Taxonomy', path: '/product-taxonomy' },
    { label: 'Stats', path: '/stats' },
    { label: 'Reset Data', path: '/reset-data' },
  ];

  const togglePermission = (path) => {
    setSelectedPermissions(prev => 
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  const openPermissionsModal = (user = null) => {
    modalTriggerRef.current = document.activeElement;
    if (user) {
      setEmail(user.email);
      setRole(user.role || 'user');
      setSelectedPermissions(user.permissions || []);
    } else {
      setEmail('');
      setRole('staff');
      setSelectedPermissions([]);
    }
    setShowModal(true);
  };

  useEffect(() => {
    if (!showModal) return;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      modalTriggerRef.current?.focus();
    };
  }, [showModal]);

  const handleToggleBlock = async (user) => {
    const confirmMessage = user.isBlocked
      ? `Unblock ${user.email}? They will regain full access to the site.`
      : `Block ${user.email}? They will be locked out of the site until unblocked.`;
    if (!window.confirm(confirmMessage)) return;

    try {
      const response = await axios.post(`${backendUrl}/api/admin/toggle-block`, {
        userId: user._id
      }, { headers: { token } });

      if (response.data.success) {
        toast.success(response.data.message);
        fetchUsers();
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      toast.error("Failed to update block status");
    }
  };

  const handleGrantLuxe = async (user) => {
    if (luxeRequestRef.current) return;
    const confirmMessage = hasActiveLuxe(user)
      ? `Extend Luxe membership for ${user.email} by 1 month from their current expiry? Their gift wrap allowance will be reset to 15.`
      : `Grant ${user.email} Luxe membership for 1 month starting now, including 15 free gift wraps?`;
    if (!window.confirm(confirmMessage)) return;

    luxeRequestRef.current = true;
    setGrantingLuxeUserId(user._id);
    try {
      const response = await axios.post(`${backendUrl}/api/admin/grant-luxe`, {
        userId: user._id
      }, { headers: { token } });

      if (response.data.success) {
        const updatedUser = response.data.user;
        setUsers(previous => previous.map(account => account._id === updatedUser._id ? { ...account, ...updatedUser } : account));
        toast.success(`Luxe membership active until ${formatDate(updatedUser.luxeMembershipExpires)}.`);
      } else {
        toast.error(response.data.message || 'Failed to grant Luxe membership');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to grant Luxe membership');
    } finally {
      luxeRequestRef.current = false;
      setGrantingLuxeUserId(null);
    }
  };

  const handleSavePermissions = async () => {
    if (savingPermissions) return;
    setSavingPermissions(true);
    try {
      const response = await axios.post(`${backendUrl}/api/admin/update-permissions`, {
        email,
        role,
        permissions: selectedPermissions
      }, { headers: { token } });

      if (response.data.success) {
        toast.success(response.data.message);
        setShowModal(false);
        fetchUsers(); // Refresh list
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      toast.error("Failed to update permissions");
    } finally {
      setSavingPermissions(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${backendUrl}/api/user/allusers`, {
        headers: {
          token
        }
      });
      if (response.data.success) {
        setUsers(response.data.users);
      } else {
        setError('Failed to fetch users');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUsers();
    }
  }, [token]);

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.mobile && user.mobile.includes(searchTerm));
    
    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'staff' && (user.role === 'staff' || user.role === 'admin')) ||
      (roleFilter === 'user' && user.role === 'user');
    const matchesMembership = membershipFilter === 'all' ||
      (membershipFilter === 'luxe' ? hasActiveLuxe(user) : !hasActiveLuxe(user));

    const joinedTime = user.createdAt ? new Date(user.createdAt).getTime() : null;
    const matchesStart = !startDate || (joinedTime !== null && joinedTime >= new Date(startDate).setHours(0, 0, 0, 0));
    const matchesEnd = !endDate || (joinedTime !== null && joinedTime <= new Date(endDate).setHours(23, 59, 59, 999));

    return matchesSearch && matchesRole && matchesMembership && matchesStart && matchesEnd;
  });

  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
  };

  // Pagination Logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, membershipFilter, startDate, endDate]);


  useEffect(() => {
    setCurrentPage(previous => Math.max(1, Math.min(previous, totalPages || 1)));
  }, [totalPages]);

  const hasFilters = Boolean(searchTerm || roleFilter !== 'all' || membershipFilter !== 'all' || startDate || endDate);
  const clearFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setMembershipFilter('all');
    clearDateFilter();
  };
  const summary = [
    { label: 'Total users', value: users.length, icon: Users, note: 'All registered accounts', tone: 'dark' },
    { label: 'Active accounts', value: users.filter(user => !user.isBlocked).length, icon: UserCheck, note: users.filter(user => user.isBlocked).length + ' blocked accounts', tone: 'green' },
    { label: 'Luxe members', value: users.filter(hasActiveLuxe).length, icon: Crown, note: 'Membership access', tone: 'rose' },
    { label: 'Staff & admins', value: users.filter(user => ['staff', 'admin'].includes(user.role)).length, icon: ShieldCheck, note: 'Team accounts', tone: 'purple' },
  ];
  const initials = name => (name || '?').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  const formatDate = value => {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
  };

  const exportUsers = () => {
    if (loading || error || filteredUsers.length === 0) return;
    const rows = [
      ['User ID', 'Name', 'Email', 'Phone', 'Role', 'Membership', 'Luxe Expiry', 'Gift Wraps Left', 'Joined Date', 'Account Status'],
      ...filteredUsers.map(user => [
        user._id, user.name, user.email, user.mobile, user.role || 'user',
        hasActiveLuxe(user) ? 'Luxe' : 'Standard', formatDate(user.luxeMembershipExpires),
        user.giftWrapsLeft ?? 0, formatDate(user.createdAt), user.isBlocked ? 'Blocked' : 'Active',
      ]),
    ];
    const csv = '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    const today = new Date().toLocaleDateString('en-CA');
    link.href = url;
    link.download = `users-${hasFilters ? 'filtered' : 'all'}-${today}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="mx-auto w-full max-w-[1600px] font-['Outfit',sans-serif] text-theme-29232e [&_*]:[font-family:inherit] [&_button]:transition-colors [&_button:disabled]:cursor-not-allowed [&_button:disabled]:opacity-50 [&_button:focus-visible]:outline [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-2 [&_button:focus-visible]:outline-theme-a85070 [&_input:focus-visible]:outline-theme-a85070 [&_select:focus-visible]:outline-theme-a85070 motion-reduce:[&_*]:animate-none motion-reduce:[&_*]:transition-none">
      <header className="flex flex-col gap-5 pb-6 pt-1 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="mb-2.5 flex items-center gap-2 text-[11px] font-medium tracking-[0.15em] text-theme-8b7782"><span className="h-[7px] w-[7px] rotate-45 rounded-sm bg-theme-c77893" />FEBEUL / PEOPLE</p>
          <h1 className="text-3xl font-semibold leading-tight tracking-[-0.04em] lg:text-[38px]">All users<span className="text-theme-c77893">.</span></h1>
          <p className="mt-2 text-xs text-theme-776d80 sm:text-[13px]">Your customers, members, and team in one place.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" className={buttonClass + ' !px-3'} onClick={fetchUsers} disabled={loading || Boolean(grantingLuxeUserId)} aria-label="Refresh users" title="Refresh users">
            <RefreshCw size={17} className={loading ? 'motion-safe:animate-spin' : ''} />
          </button>
          <button type="button" className={darkButtonClass + ' flex-1 lg:flex-none'} onClick={() => openPermissionsModal()}>
            <Plus size={17} aria-hidden="true" />Add Staff Permissions
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4" aria-label="All account totals">
        {summary.map(({ label, value, icon: Icon, note, tone }) => (
          <article key={label} className={'rounded-xl border p-4 shadow-sm motion-safe:animate-[fadeIn_0.3s_ease-out] sm:p-5 ' + (tone === 'dark' ? 'border-theme-2f2633 bg-theme-2f2633 text-white' : 'border-theme-eae5ed bg-white')} aria-label={label}>
            <div className={'flex items-center justify-between gap-2 text-[11px] font-medium sm:text-xs ' + (tone === 'dark' ? 'text-theme-e0d5e3' : 'text-theme-776d80')}>
              <span>{label}</span><span className={'grid h-8 w-8 shrink-0 place-items-center rounded-lg ' + summaryIcons[tone]}><Icon size={17} aria-hidden="true" /></span>
            </div>
            <strong className="mb-2 mt-3 block text-3xl font-semibold leading-tight tracking-[-0.04em] tabular-nums">{loading || error ? '\u2014' : value.toLocaleString('en-IN')}</strong>
            <p className={'text-[10px] leading-relaxed sm:text-[11px] ' + (tone === 'dark' ? 'text-theme-c5b8cb' : 'text-theme-84758e')}>{loading || error ? 'Account totals unavailable' : note}</p>
          </article>
        ))}
      </div>
      <p className="mb-6 mt-2.5 text-[10px] leading-relaxed text-theme-897b92 sm:text-[11px]">Account totals include all users, regardless of the filters below.</p>

      <section className="overflow-hidden rounded-2xl border border-theme-eae5ed bg-white shadow-sm" aria-labelledby="users-directory-title">
        <div className="flex items-start justify-between gap-3 px-4 py-5 sm:items-center sm:px-6">
          <div>
            <h2 id="users-directory-title" className="text-base font-semibold tracking-tight sm:text-[17px]">User directory</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-theme-776d80 sm:text-xs">Manage account access, Luxe membership, and staff permissions.</p>
          </div>
          <span className="shrink-0 rounded-md border border-theme-efdee7 bg-theme-faf1f6 px-2 py-1 text-[10px] font-medium text-theme-947184 sm:px-2.5 sm:text-[11px]">{loading || error ? '\u2014' : filteredUsers.length} users</span>
        </div>
        <div className="flex flex-col gap-3 px-4 pb-5 sm:px-6">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-theme-eae5ed px-3 text-theme-9a849f focus-within:border-theme-ba8099 focus-within:ring-2 focus-within:ring-theme-faf0f5 sm:max-w-[460px]">
              <Search size={17} className="shrink-0" aria-hidden="true" />
              <label htmlFor="users-search" className="sr-only">Search users</label>
              <input id="users-search" type="search" className="min-w-0 flex-1 border-0 bg-transparent py-3 text-xs text-theme-55465d outline-none placeholder:text-theme-95859e" placeholder="Search name, email, phone..." value={searchTerm} onChange={event => setSearchTerm(event.target.value)} />
              {searchTerm && <button type="button" className="grid min-h-8 min-w-6 place-items-center" onClick={() => setSearchTerm('')} aria-label="Clear user search"><X size={15} /></button>}
            </div>
            <label className="flex min-w-0 items-center gap-2 rounded-lg border border-theme-eae5ed px-3 text-theme-9983a2">
              <SlidersHorizontal size={15} aria-hidden="true" /><span className="sr-only">Filter by role</span>
              <select className="min-w-0 flex-1 border-0 bg-white py-3 text-xs text-theme-675571" value={roleFilter} onChange={event => setRoleFilter(event.target.value)}>
                <option value="all">All Roles</option><option value="staff">Staff/Admin</option><option value="user">Normal Users</option>
              </select>
            </label>
            <label className="flex min-w-0 items-center gap-2 rounded-lg border border-theme-eae5ed px-3 text-theme-9983a2">
              <Crown size={15} aria-hidden="true" /><span className="sr-only">Filter by membership</span>
              <select className="min-w-0 flex-1 border-0 bg-white py-3 text-xs text-theme-675571" value={membershipFilter} onChange={event => setMembershipFilter(event.target.value)}>
                <option value="all">All Memberships</option><option value="luxe">Luxe Members</option><option value="standard">Standard Users</option>
              </select>
            </label>
            <button type="button" className={buttonClass + ' w-full shrink-0 sm:ml-auto sm:w-auto'} onClick={exportUsers} disabled={loading || Boolean(error) || filteredUsers.length === 0} aria-describedby="users-export-description">
              <Download size={16} aria-hidden="true" />Export CSV
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="inline-flex w-full items-center gap-1.5 text-[11px] text-theme-8b7a95 sm:w-auto"><CalendarRange size={15} aria-hidden="true" />Joined date</span>
            <div className="flex w-full min-w-0 items-end gap-1.5 sm:w-auto sm:items-center sm:gap-2">
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-[11px] text-theme-998a9f sm:flex-row sm:items-center sm:gap-2">
                <span>From</span>
                <input type="date" className="min-w-0 w-full rounded-md border-theme-eae5ed bg-white px-1 py-2 text-[11px] text-theme-6d5878 sm:w-auto sm:px-2" value={startDate} max={endDate || undefined} onChange={event => setStartDate(event.target.value)} aria-label="Joined from" />
              </label>
              <span className="pb-2 text-theme-b6a7be sm:pb-0" aria-hidden="true">&ndash;</span>
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-[11px] text-theme-998a9f sm:flex-row sm:items-center sm:gap-2">
                <span>To</span>
                <input type="date" className="min-w-0 w-full rounded-md border-theme-eae5ed bg-white px-1 py-2 text-[11px] text-theme-6d5878 sm:w-auto sm:px-2" value={endDate} min={startDate || undefined} onChange={event => setEndDate(event.target.value)} aria-label="Joined to" />
              </label>
              {(startDate || endDate) && <button type="button" className="grid min-h-8 min-w-6 place-items-center text-theme-a85070" onClick={clearDateFilter} aria-label="Clear date filter" title="Clear date filter"><X size={15} /></button>}
            </div>
            {hasFilters && <button type="button" className="ml-auto inline-flex min-h-8 items-center gap-1 text-[11px] text-theme-a85070 hover:text-theme-73364e" onClick={clearFilters}><X size={13} />Clear filters</button>}
          </div>
          <p id="users-export-description" className="text-[10px] leading-relaxed text-theme-897b92 sm:text-[11px]">Exports all matching users across every page using the current search, role, membership and joined-date filters.</p>
        </div>

        {error ? (
          <div className={emptyClass} role="alert">
            <span className="mb-1 grid h-12 w-12 place-items-center rounded-xl bg-theme-fcf0f4 text-theme-b96e89"><CircleAlert size={25} /></span>
            <h3 className="text-base font-medium">Couldn&apos;t load users</h3>
            <p className="max-w-[300px] break-words text-xs text-theme-947c9e">{error}</p>
            <button type="button" className={buttonClass + ' mt-1'} onClick={fetchUsers}>Try again</button>
          </div>
        ) : loading ? (
          <div className="px-4 sm:px-6" role="status" aria-label="Loading users">
            <span className="sr-only">Loading users...</span>
            {[0, 1, 2, 3, 4].map(index => (
              <div key={index} className="flex items-center gap-3 border-t border-theme-f3edf6 py-6 motion-safe:animate-pulse">
                <span className="h-9 w-9 rounded-lg bg-theme-eee7f2" />
                <div className="flex-1 space-y-2"><div className="h-2.5 w-28 rounded bg-theme-eee7f2" /><div className="h-2.5 w-20 rounded bg-theme-eee7f2" /></div>
                <span className="hidden h-2.5 w-20 rounded bg-theme-eee7f2 sm:block" />
              </div>
            ))}
          </div>
        ) : paginatedUsers.length > 0 ? (
          <>
            <div className="w-full overflow-auto border-t border-theme-f1ecf4">
              <table className="block w-full text-left text-xs xl:table xl:min-w-[1000px]">
                <caption className="sr-only">Registered users, membership, account status, and permissions</caption>
                <thead className="hidden bg-theme-faf8fb text-[11px] font-medium text-theme-8c7799 xl:table-header-group [&_th]:whitespace-nowrap [&_th]:px-3 [&_th]:py-3 [&_th]:font-medium [&_th:first-child]:pl-6 [&_th:last-child]:pr-6">
                  <tr><th scope="col">User</th><th scope="col">Phone</th><th scope="col">Role</th><th scope="col">Membership</th><th scope="col">Gift wraps</th><th scope="col">Joined</th><th scope="col">Status</th><th scope="col">Actions</th></tr>
                </thead>
                <tbody className="block px-4 sm:px-6 xl:table-row-group xl:px-0 [&_tr:last-child_td]:border-b-0">
                  {paginatedUsers.map((user, index) => (
                    <tr key={user._id} className="grid grid-cols-2 gap-x-3 gap-y-4 border-b border-theme-eae5ed py-5 last:border-b-0 hover:bg-theme-fdfafd sm:grid-cols-3 xl:table-row xl:border-0 xl:py-0">
                      <td className="col-span-full min-w-0 xl:border-b xl:border-theme-f3eff6 xl:py-3.5 xl:pl-6 xl:pr-3 xl:align-middle">
                        <div className="flex min-w-0 items-center gap-3 xl:min-w-[175px]">
                          <span className={'grid h-9 w-9 shrink-0 place-items-center rounded-xl border text-xs font-semibold ' + avatarColors[index % avatarColors.length]} aria-hidden="true">{initials(user.name || user.email)}</span>
                          <div className="min-w-0">
                            <strong className="block text-[13px] font-medium text-theme-504256 [overflow-wrap:anywhere] xl:max-w-[200px] xl:text-xs">{user.name || 'N/A'}</strong>
                            <span className="mt-1 block text-[11px] text-theme-8c7b97 [overflow-wrap:anywhere] xl:max-w-[215px]" title={user.email}>{user.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className={cellClass} data-label="Phone"><span className="whitespace-nowrap text-[11px] tabular-nums text-theme-86728f">{user.mobile || 'N/A'}</span></td>
                      <td className={cellClass} data-label="Role"><span className={badgeClass + ' capitalize ' + (roleColors[user.role] || roleColors.user)}>{user.role || 'user'}</span></td>
                      <td className={cellClass} data-label="Membership">
                        {hasActiveLuxe(user) ? (
                          <div className="flex flex-col items-start gap-1.5">
                            <span className={badgeClass + ' bg-theme-faf1e5 text-theme-a17e49'}><Crown size={12} aria-hidden="true" />Luxe</span>
                            <span className="whitespace-nowrap text-[10px] text-theme-9c8ba6">Until {formatDate(user.luxeMembershipExpires)}</span>
                          </div>
                        ) : <span className="text-[11px] text-theme-9c8ba6">Standard</span>}
                      </td>
                      <td className={cellClass} data-label="Gift wraps"><span className="inline-flex items-center gap-1.5 text-[11px] text-theme-8f789c"><Gift size={14} className="text-theme-b7a3bf" aria-hidden="true" />{user.giftWrapsLeft ?? 0}</span></td>
                      <td className={cellClass} data-label="Joined"><span className="whitespace-nowrap text-[11px] tabular-nums text-theme-86728f">{formatDate(user.createdAt)}</span></td>
                      <td className={cellClass} data-label="Status"><span className={badgeClass + (user.isBlocked ? ' bg-theme-faeef2 text-theme-b0607b' : ' bg-theme-edf6f1 text-theme-4f876c')}><i className="h-1 w-1 rounded-full bg-current" />{user.isBlocked ? 'Blocked' : 'Active'}</span></td>
                      <td className="col-span-full min-w-0 xl:border-b xl:border-theme-f3eff6 xl:py-3.5 xl:pl-3 xl:pr-6 xl:align-middle">
                        <div className="flex flex-wrap items-start gap-2 xl:flex-col xl:gap-1">
                          <button type="button" className="inline-flex min-h-9 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-theme-efdfc5 bg-theme-faf1e5 px-2 py-1.5 text-[10px] font-medium text-theme-a17e49 hover:border-theme-d8bd92 hover:bg-theme-f7e9d5 sm:text-[11px] xl:min-h-7 xl:text-[10px]" onClick={() => handleGrantLuxe(user)} disabled={Boolean(grantingLuxeUserId)} aria-label={(hasActiveLuxe(user) ? 'Extend' : 'Grant') + ' Luxe membership for 1 month for ' + user.email} aria-busy={grantingLuxeUserId === user._id}>
                            {grantingLuxeUserId === user._id ? <RefreshCw size={14} className="motion-safe:animate-spin" aria-hidden="true" /> : <Crown size={14} aria-hidden="true" />}
                            {grantingLuxeUserId === user._id ? 'Granting...' : <>{hasActiveLuxe(user) ? 'Extend' : 'Grant'} Luxe &middot; 1 month</>}
                          </button>
                          <button type="button" className="inline-flex min-h-9 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-theme-e9dfee bg-white px-2 py-1.5 text-[10px] font-medium text-theme-94749f hover:border-theme-ceafdb hover:bg-theme-faf5fd sm:text-[11px] xl:min-h-7 xl:text-[10px]" onClick={() => openPermissionsModal(user)} aria-label={'View Permissions for ' + user.email}><LockKeyhole size={14} aria-hidden="true" />View Permissions</button>
                          <button type="button" className={'inline-flex min-h-9 items-center justify-center gap-1 whitespace-nowrap rounded-md px-2 py-1.5 text-[10px] font-medium sm:text-[11px] xl:min-h-7 xl:text-[10px] ' + (user.isBlocked ? 'text-theme-6a9580 hover:bg-theme-eef7f2 hover:text-theme-47755c' : 'text-theme-af7388 hover:bg-theme-fcf0f4 hover:text-theme-a04d6a')} onClick={() => handleToggleBlock(user)} aria-label={(user.isBlocked ? 'Unblock' : 'Block') + ' ' + user.email}>
                            {user.isBlocked ? <UserCheck size={14} aria-hidden="true" /> : <ShieldOff size={14} aria-hidden="true" />}{user.isBlocked ? 'Unblock' : 'Block'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 border-t border-theme-eae5ed px-4 py-4 sm:justify-between sm:px-6">
              <p className="text-[11px] text-theme-94809f [&_strong]:font-medium [&_strong]:text-theme-715a7c">Showing <strong>{(currentPage - 1) * itemsPerPage + 1}&ndash;{Math.min(currentPage * itemsPerPage, filteredUsers.length)}</strong> of <strong>{filteredUsers.length}</strong> users</p>
              {totalPages > 1 && <nav className="flex min-w-0 items-center justify-center gap-1 sm:gap-2" aria-label="User directory pagination">
                <button type="button" className={pageButtonClass + ' border-theme-eae1ef bg-white text-theme-8b6d9a hover:enabled:bg-theme-faf6fc'} onClick={() => setCurrentPage(previous => Math.max(previous - 1, 1))} disabled={currentPage === 1} aria-label="Previous page"><ChevronLeft size={15} /><span className="hidden sm:inline">Previous</span></button>
                <div className="flex flex-wrap items-center justify-center gap-1">
                  {[...Array(totalPages)].map((_, index) => {
                    const pageNumber = index + 1;
                    if (pageNumber === 1 || pageNumber === totalPages || (pageNumber >= currentPage - 2 && pageNumber <= currentPage + 2)) {
                      return <button type="button" key={pageNumber} className={pageButtonClass + (currentPage === pageNumber ? ' border-theme-34283c bg-theme-34283c text-white' : ' border-theme-eae1ef bg-white text-theme-8b6d9a hover:bg-theme-faf6fc')} onClick={() => setCurrentPage(pageNumber)} aria-label={'Page ' + pageNumber} aria-current={currentPage === pageNumber ? 'page' : undefined}>{pageNumber}</button>;
                    }
                    if (pageNumber === currentPage - 3 || pageNumber === currentPage + 3) return <span key={pageNumber} className="px-0.5 text-[11px] text-theme-b3a0bf" aria-hidden="true">&hellip;</span>;
                    return null;
                  })}
                </div>
                <button type="button" className={pageButtonClass + ' border-theme-eae1ef bg-white text-theme-8b6d9a hover:enabled:bg-theme-faf6fc'} onClick={() => setCurrentPage(previous => Math.min(previous + 1, totalPages))} disabled={currentPage === totalPages} aria-label="Next page"><span className="hidden sm:inline">Next</span><ChevronRight size={15} /></button>
              </nav>}
            </div>
          </>
        ) : (
          <div className={emptyClass}>
            <span className="mb-1 grid h-12 w-12 place-items-center rounded-xl bg-theme-f8f2fa text-theme-af91bb">{hasFilters ? <Search size={25} /> : <Users size={25} />}</span>
            <h3 className="text-base font-medium">{hasFilters ? 'No matching users' : 'Your directory is ready'}</h3>
            <p className="max-w-[300px] text-xs text-theme-947c9e">{hasFilters ? 'Try a different name, role, membership, or joined date range.' : 'Registered customers and team members will appear here.'}</p>
            {hasFilters && <button type="button" className={buttonClass + ' mt-1'} onClick={clearFilters}>Clear filters</button>}
          </div>
        )}
      </section>
      <footer className="flex flex-wrap items-start justify-between gap-3 pb-1 pt-5 text-[10px] text-theme-94809f sm:text-[11px]">
        <span className="inline-flex items-start gap-1.5"><ShieldCheck size={13} className="shrink-0" aria-hidden="true" />Account access is controlled by staff permissions.</span><span>10 users per page</span>
      </footer>

      {showModal && (
        <dialog ref={dialogRef} className="m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-[660px] flex-col overflow-hidden rounded-2xl border border-theme-e5dbe9 bg-white p-0 text-theme-29232e shadow-2xl backdrop:bg-theme-201727/50 backdrop:backdrop-blur-sm open:flex motion-safe:animate-[fadeIn_0.2s_ease-out]" aria-labelledby="users-permissions-title" aria-describedby="users-permissions-description" onCancel={event => { event.preventDefault(); if (!savingPermissions) setShowModal(false); }}>
          <div className="flex shrink-0 items-start gap-2.5 border-b border-theme-eae5ed px-4 py-5 sm:items-center sm:gap-3 sm:px-6">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-theme-f9edf3 text-theme-af6c8b sm:h-11 sm:w-11"><ShieldCheck size={23} aria-hidden="true" /></span>
            <div>
              <h2 id="users-permissions-title" className="text-base font-semibold leading-tight tracking-tight sm:text-lg">Manage Staff Permissions</h2>
              <p id="users-permissions-description" className="mt-1 text-[11px] text-theme-918099 sm:text-xs">Set an existing account&apos;s role and allowed pages.</p>
            </div>
            <button type="button" className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-lg text-theme-a68baf hover:bg-theme-f6f1f8" aria-label="Close permissions" onClick={() => setShowModal(false)} disabled={savingPermissions}><X size={19} /></button>
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
              <label className="flex min-w-0 flex-col gap-2 text-xs font-medium text-theme-7c6189" htmlFor="users-permission-email">User Email
                <input id="users-permission-email" className="min-h-[42px] min-w-0 rounded-lg border-theme-e3d8ea bg-white px-3 py-2.5 text-[13px] font-normal text-theme-61466f" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="Enter user email" disabled={savingPermissions} autoFocus />
              </label>
              <label className="flex min-w-0 flex-col gap-2 text-xs font-medium text-theme-7c6189" htmlFor="users-permission-role">Role
                <select id="users-permission-role" className="min-h-[42px] min-w-0 rounded-lg border-theme-e3d8ea bg-white px-3 py-2.5 text-[13px] font-normal text-theme-61466f" value={role} onChange={event => setRole(event.target.value)} disabled={savingPermissions}><option value="user">User</option><option value="staff">Staff</option></select>
              </label>
            </div>
            <fieldset disabled={savingPermissions} className="min-w-0 border-0">
              <legend className="mb-3 w-full text-xs font-medium text-theme-7c6189">Allowed Pages <span className="float-right text-[11px] font-normal text-theme-ab809d">{selectedPermissions.length} selected</span></legend>
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                {permissionOptions.map(option => (
                  <label key={option.path} className={'flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-2.5 text-[11px] sm:px-2.5 sm:text-xs ' + (selectedPermissions.includes(option.path) ? 'border-theme-e8c9da bg-theme-faf0f6 text-theme-a86589' : 'border-theme-eee6f3 text-theme-8b709b hover:bg-theme-fcf8fe')}>
                    <input type="checkbox" className="h-4 w-4 shrink-0 rounded accent-[#ac6689]" checked={selectedPermissions.includes(option.path)} onChange={() => togglePermission(option.path)} />
                    <span>{option.label}</span>
                    {selectedPermissions.includes(option.path) && <Check size={13} className="ml-auto hidden shrink-0 sm:block" aria-hidden="true" />}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-theme-eae5ed bg-theme-fdfbfe px-4 py-4 sm:px-6">
            <button type="button" className={buttonClass} onClick={() => setShowModal(false)} disabled={savingPermissions}>Cancel</button>
            <button type="button" className={darkButtonClass} onClick={handleSavePermissions} disabled={savingPermissions}>
              {savingPermissions ? <RefreshCw size={15} className="motion-safe:animate-spin" aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}{savingPermissions ? 'Saving...' : 'Save Permissions'}
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
};

export default AllUsers;
