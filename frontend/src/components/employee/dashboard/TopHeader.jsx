import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_BASE, authHeaders } from '../../../api/config';
import notifIcon from '../../../assets/icon/notif.png';

/* ─────────────────────────────────────────────
   REUSABLE HEADER COMPONENT WITH NOTIFICATIONS
 ───────────────────────────────────────────── */
const TopHeader = ({ employee, title, subtitle, onNavigate }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    const fetchNotifications = async () => {
        try {
            const res = await axios.get(`${API_BASE}/notifications`, { headers: authHeaders(), withCredentials: true });
            setNotifications(res.data);
            setUnreadCount(res.data.filter(n => !n.isRead).length);
        } catch (err) { console.error('Error fetching notifs:', err); }
    };

    useEffect(() => {
        fetchNotifications();
        const socket = io(API_BASE.replace('/api', ''));
        socket.on('new_notification', (notif) => {
            setNotifications(prev => [notif, ...prev]);
            setUnreadCount(prev => prev + 1);
        });
        return () => socket.disconnect();
    }, []);

    const markAllRead = async () => {
        try {
            await axios.patch(`${API_BASE}/notifications/mark-read`, {}, { headers: authHeaders(), withCredentials: true });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
            setIsOpen(false);
        } catch (err) { console.error(err); }
    };

    const deleteAll = async () => {
        try {
            await axios.delete(`${API_BASE}/notifications/delete-all`, { headers: authHeaders(), withCredentials: true });
            setNotifications([]);
            setUnreadCount(0);
            setIsOpen(false);
        } catch (err) { console.error(err); }
    };

    const handleNotifClick = async (notif) => {
        try {
            if (!notif.isRead) {
                await axios.patch(`${API_BASE}/notifications/${notif._id}/read`, {}, { headers: authHeaders(), withCredentials: true });
                setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
            if (onNavigate) {
                onNavigate('bookings');
                setIsOpen(false);
            }
        } catch (err) { console.error(err); }
    };

    return (
        <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
            <div>
                <h4 className="mb-0 font-poppins text-dark-secondary" style={{ fontWeight: 700 }}>{title}</h4>
                <p className="mb-0 text-dark-gray400 font-poppins" style={{ fontSize: '0.85rem' }}>{subtitle}</p>
            </div>
            <div className="d-flex align-items-center gap-4">
                <div className="text-end">
                    <span className="font-poppins text-dark-gray400 d-block" style={{ fontSize: '0.85rem' }}>
                        Welcome, <strong className="text-dark-secondary">{employee?.fullName ?? 'Employee'}</strong>
                    </span>
                </div>
                <div className="position-relative" style={{ cursor: 'pointer' }}>
                    <div onClick={() => setIsOpen(!isOpen)} className="position-relative d-inline-block p-1">
                        <img src={notifIcon} alt="Notification Icon" style={{ width: '24px' }} />
                        {unreadCount > 0 && (
                            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.65rem' }}>
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </div>

                    {isOpen && (
                        <div className="position-absolute dropdown-menu show shadow-lg rounded-3 mt-2" style={{ right: 0, width: '320px', left: 'auto', zIndex: 1050 }}>
                            <div className="p-3 border-bottom bg-light">
                                <h6 className="mb-0 fw-bold text-dark-secondary">Notifications</h6>
                            </div>
                            <div className="p-0" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                {notifications.length === 0 ? (
                                    <div className="p-4 text-center text-muted"><small>No new notifications</small></div>
                                ) : (
                                    notifications.map((n) => (
                                        <div key={n._id}
                                            className={`notification p-3 border-bottom ${!n.isRead ? 'background-light-secondary' : 'background-light-primary'}`}
                                            onClick={() => handleNotifClick(n)}
                                            style={{ cursor: 'pointer' }}>
                                            <p className="mb-1 text-sm font-poppins text-dark" style={{ fontSize: '0.85rem' }}>{n.message}</p>
                                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>{new Date(n.createdAt).toLocaleString()}</small>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="p-2 border-top d-flex justify-content-between bg-light">
                                <button onClick={markAllRead} className="btn btn-sm btn-link brand-primary text-decoration-none" style={{ fontSize: '0.8rem' }}>Mark all read</button>
                                <button onClick={deleteAll} className="btn btn-sm btn-link text-danger text-decoration-none" style={{ fontSize: '0.8rem' }}>Delete all</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TopHeader;
