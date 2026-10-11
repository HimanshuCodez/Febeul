import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Star, CalendarRange, X, MessageSquare, Clock3, CheckCircle2, XCircle, RefreshCcw, ExternalLink, Trash2, UserRound, Loader2 } from 'lucide-react';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const ReviewsAdmin = ({ token }) => {

    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const role = localStorage.getItem('role');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        if (token) { // Only fetch if a valid token is provided
            fetchAllReviews();
        } else {
            toast.error("Admin not authenticated.");
            setLoading(false);
        }
    }, [token]);

    const fetchAllReviews = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${backendUrl}/api/review/all`, {
                headers: {
                    token: token,
                },
            });

            if (response.data.success) {
                setReviews(response.data.reviews);
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            console.error("Error fetching all reviews:", error);
            toast.error("Failed to fetch reviews.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (reviewId, newStatus) => {
        try {
            const response = await axios.post(`${backendUrl}/api/review/update-status`, 
                { reviewId, status: newStatus },
                {
                    headers: {
                        token: token,
                    },
                }
            );

            if (response.data.success) {
                toast.success(response.data.message);
                setReviews(prevReviews => prevReviews.map(review => 
                    review._id === reviewId ? { ...review, status: newStatus } : review
                ));
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            console.error("Error updating review status:", error);
            toast.error("Failed to update status.");
        }
    };

    const handleDeleteReview = async (reviewId) => {
        if (!window.confirm("Are you sure you want to delete this review? This action cannot be undone.")) {
            return;
        }

        try {
            const response = await axios.delete(`${backendUrl}/api/review/remove/${reviewId}`, {
                headers: {
                    token: token,
                },
            });

            if (response.data.success) {
                toast.success(response.data.message);
                setReviews(prevReviews => prevReviews.filter(review => review._id !== reviewId));
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            console.error("Error deleting review:", error);
            toast.error(error.response?.data?.message || "Failed to delete review.");
        }
    };

    const clearDateFilter = () => {
        setStartDate('');
        setEndDate('');
    };

    const filteredReviews = reviews.filter(review => {
        const reviewTime = new Date(review.date).getTime();
        const matchesStart = !startDate || reviewTime >= new Date(startDate).setHours(0, 0, 0, 0);
        const matchesEnd = !endDate || reviewTime <= new Date(endDate).setHours(23, 59, 59, 999);
        return matchesStart && matchesEnd;
    });

    const summaryCards = [
        { label: 'Total reviews', value: reviews.length, icon: MessageSquare, color: 'bg-white/10 text-[#e9c7d7]' },
        { label: 'Pending review', value: reviews.filter(review => !review.status || review.status === 'pending').length, icon: Clock3, color: 'bg-amber-50 text-amber-600' },
        { label: 'Approved', value: reviews.filter(review => review.status === 'approved').length, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
        { label: 'Rejected', value: reviews.filter(review => review.status === 'rejected').length, icon: XCircle, color: 'bg-rose-50 text-rose-600' },
    ];

    return (
        <div className="mx-auto w-full min-w-0 max-w-[1600px] font-[Outfit,sans-serif] text-[#342a3c] [&_*]:[font-family:inherit] [&_button]:focus-visible:outline-none [&_button]:focus-visible:ring-2 [&_button]:focus-visible:ring-[#b77997] [&_button]:focus-visible:ring-offset-2 motion-reduce:[&_*]:transition-none motion-reduce:[&_*]:animate-none">
            <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                    <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9c839e]">
                        <span className="h-1.5 w-1.5 rotate-45 bg-[#b77997]" aria-hidden="true" /> Febeul / Customer experience
                    </p>
                    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Customer reviews<span className="text-[#b77997]">.</span></h1>
                    <p className="mt-2 text-sm leading-relaxed text-[#8b7b93]">Review customer feedback and manage what appears on your store.</p>
                </div>
                <button type="button" onClick={fetchAllReviews} disabled={loading} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#eae5ed] bg-white px-4 py-2.5 text-xs font-medium shadow-sm transition-colors hover:bg-[#faf7fb] disabled:cursor-wait disabled:opacity-60">
                    <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} aria-hidden="true" /> Refresh reviews
                </button>
            </header>

            <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
                {summaryCards.map(({ label, value, icon: Icon, color }, index) => (
                    <div key={label} className={'min-w-0 rounded-2xl border p-4 shadow-[0_3px_16px_-12px_rgba(48,39,53,0.2)] sm:p-5 ' + (index === 0 ? 'border-[#302735] bg-[#302735] text-white' : 'border-[#eae5ed] bg-white')}>
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <p className={'text-xs font-medium ' + (index === 0 ? 'text-[#d4c5d8]' : 'text-[#8b7b93]')}>{label}</p>
                            <span className={'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ' + color}><Icon size={16} aria-hidden="true" /></span>
                        </div>
                        <p className="text-3xl font-semibold tracking-tight tabular-nums">{loading ? '\u2014' : value}</p>
                        <p className={'mt-1 text-[11px] ' + (index === 0 ? 'text-[#b9a7c0]' : 'text-[#a292a9]')}>All dates</p>
                    </div>
                ))}
            </div>

            <section aria-label="Customer reviews" className="min-w-0 overflow-hidden rounded-2xl border border-[#eae5ed] bg-white shadow-[0_4px_24px_-16px_rgba(48,39,53,0.18)]">
                <div className="flex flex-col justify-between gap-4 border-b border-[#eee9f0] p-4 sm:p-5 xl:flex-row xl:items-center">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f7eff4] text-[#a85070]"><MessageSquare size={18} aria-hidden="true" /></span>
                        <div>
                            <h2 className="text-sm font-semibold">Review moderation</h2>
                            <p className="mt-0.5 text-xs text-[#8b7b93]" aria-live="polite">{loading ? 'Fetching customer feedback...' : filteredReviews.length + ' of ' + reviews.length + ' reviews shown'}</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-end gap-2 sm:gap-3">
                        <label className="min-w-0 flex-1 sm:flex-none">
                            <span className="mb-1.5 block text-[11px] font-medium text-[#8b7b93]">From date</span>
                            <input type="date" value={startDate} max={endDate || undefined} onChange={(e) => setStartDate(e.target.value)} aria-label="From date" className="min-h-10 w-full min-w-0 rounded-lg border border-[#eae5ed] bg-[#fcfafc] px-2 py-2 text-xs outline-none focus:border-[#b77997] focus:ring-2 focus:ring-[#f5e9f0] sm:w-36" />
                        </label>
                        <label className="min-w-0 flex-1 sm:flex-none">
                            <span className="mb-1.5 block text-[11px] font-medium text-[#8b7b93]">To date</span>
                            <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} aria-label="To date" className="min-h-10 w-full min-w-0 rounded-lg border border-[#eae5ed] bg-[#fcfafc] px-2 py-2 text-xs outline-none focus:border-[#b77997] focus:ring-2 focus:ring-[#f5e9f0] sm:w-36" />
                        </label>
                        {(startDate || endDate) && (
                            <button type="button" onClick={clearDateFilter} title="Clear date filter" aria-label="Clear date filter" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#eae5ed] text-[#a85070] transition-colors hover:bg-[#faf0f6]"><X size={16} /></button>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div role="status" className="flex min-h-64 flex-col items-center justify-center gap-3 px-4 py-16 text-sm text-[#8b7b93]"><Loader2 size={26} className="animate-spin text-[#b77997]" />Loading reviews...</div>
                ) : filteredReviews.length === 0 ? (
                    <div className="flex min-h-64 flex-col items-center justify-center px-4 py-16 text-center">
                        <span className="mb-4 rounded-2xl bg-[#f7f3f8] p-4 text-[#b399bf]"><CalendarRange size={26} /></span>
                        <h3 className="text-sm font-semibold">{reviews.length === 0 ? 'No reviews found.' : 'No reviews match the selected date range.'}</h3>
                        <p className="mt-2 text-xs text-[#8b7b93]">{reviews.length === 0 ? 'Customer feedback will appear here when a review is submitted.' : 'Try a wider date range to see more customer feedback.'}</p>
                        {(startDate || endDate) && <button type="button" onClick={clearDateFilter} className="mt-4 rounded-lg border border-[#eae5ed] px-4 py-2 text-xs font-medium text-[#a85070] hover:bg-[#faf0f6]">Clear date filter</button>}
                    </div>
                ) : (
                    <div className="min-w-0 overflow-x-auto">
                        <table className="block w-full xl:table xl:table-fixed">
                            <thead className="sr-only bg-[#faf8fb] xl:not-sr-only xl:table-header-group">
                                <tr className="[&_th]:px-4 [&_th]:py-3.5 [&_th]:text-left [&_th]:text-[10px] [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-[#8b7b93]">
                                    <th scope="col" className="w-[19%]">Customer</th>
                                    <th scope="col" className="w-[17%]">Product</th>
                                    <th scope="col" className="w-[27%]">Rating &amp; review</th>
                                    <th scope="col" className="w-[11%]">Submitted</th>
                                    <th scope="col" className="w-[11%]">Status</th>
                                    <th scope="col" className="w-[15%]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="grid gap-3 bg-[#faf8fb] p-3 md:grid-cols-2 xl:table-row-group xl:divide-y xl:divide-[#eee9f0] xl:bg-white xl:p-0">
                                {filteredReviews.map(review => (
                                    <tr key={review._id} className="grid min-w-0 grid-cols-2 gap-x-3 rounded-xl border border-[#eae5ed] bg-white p-4 transition-colors xl:table-row xl:rounded-none xl:border-0 xl:p-0 xl:hover:bg-[#fdfbfd]">
                                        <td className="col-span-2 min-w-0 pb-4 xl:px-4 xl:py-5 xl:align-top">
                                            <div className="flex items-start gap-2.5">
                                                {review.userId?.profilePicture ? <img src={review.userId.profilePicture} alt={review.userId.name} className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-[#eee9f0]" /> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f4edf6] text-[#aa8ab4]"><UserRound size={16} /></span>}
                                                <div className="min-w-0">
                                                    <p className="break-words text-sm font-medium">{review.userId?.name || 'Anonymous'}</p>
                                                    <p className="mt-1 break-all text-[11px] text-[#8b7b93]">{review.userId?.email || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="col-span-2 min-w-0 border-t border-[#f1ecf3] py-3 xl:border-0 xl:px-4 xl:py-5 xl:align-top">
                                            <a href={'https://febeul.com/product/' + review.productId?._id} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-2 text-xs font-medium text-[#a85070] hover:underline focus-visible:outline-[#b77997]">
                                                {review.productId?.image && <img src={review.productId.image} alt={review.productId.name} className="h-10 w-10 shrink-0 rounded-lg border border-[#eee9f0] object-cover" />}
                                                <span className="min-w-0 break-words leading-relaxed">{review.productId?.name || 'Unknown Product'} <ExternalLink size={11} className="inline shrink-0" aria-hidden="true" /></span>
                                            </a>
                                        </td>
                                        <td className="col-span-2 min-w-0 pb-4 pt-1 xl:px-4 xl:py-5 xl:align-top">
                                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                                <span className="flex items-center gap-0.5" aria-hidden="true">{[1, 2, 3, 4, 5].map(star => <Star key={star} size={13} className={review.rating >= star ? 'fill-amber-400 text-amber-400' : 'text-[#e0d8e5]'} />)}</span>
                                                <span className="text-[11px] font-medium text-[#8b7b93]">{review.rating} Stars</span>
                                            </div>
                                            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[#65566f]">{review.comment}</p>
                                            {review.images && review.images.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{review.images.map((image, index) => <img key={index} src={image} alt={'Review image ' + (index + 1)} className="h-12 w-12 rounded-lg border border-[#eee9f0] object-cover" />)}</div>}
                                        </td>
                                        <td className="border-t border-[#f1ecf3] py-3 text-xs text-[#8b7b93] xl:border-0 xl:px-4 xl:py-5 xl:align-top">
                                            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[#a292a9] xl:hidden">Submitted</span>
                                            {new Date(review.date).toLocaleDateString()}
                                        </td>
                                        <td className="border-t border-[#f1ecf3] py-3 text-right xl:border-0 xl:px-4 xl:py-5 xl:text-left xl:align-top">
                                            <span className={'inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-medium capitalize ' + (review.status === 'approved' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : review.status === 'rejected' ? 'border-rose-100 bg-rose-50 text-rose-700' : 'border-amber-100 bg-amber-50 text-amber-700')}>
                                                <span className="h-1 w-1 rounded-full bg-current" aria-hidden="true" />{review.status || 'pending'}
                                            </span>
                                        </td>
                                        <td className="col-span-2 border-t border-[#f1ecf3] pt-3 xl:border-0 xl:px-4 xl:py-5 xl:align-top">
                                            <div className="flex flex-wrap gap-2">
                                                {review.status !== 'approved' && <button type="button" onClick={() => handleUpdateStatus(review._id, 'approved')} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 transition-colors hover:bg-emerald-100"><CheckCircle2 size={12} aria-hidden="true" />Approve</button>}
                                                {review.status !== 'rejected' && <button type="button" onClick={() => handleUpdateStatus(review._id, 'rejected')} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[#eae5ed] bg-white px-2.5 py-1.5 text-[11px] font-medium text-[#827089] transition-colors hover:bg-[#f7f3f8]"><XCircle size={12} aria-hidden="true" />Reject</button>}
                                                {role !== 'staff' && <button type="button" onClick={() => handleDeleteReview(review._id)} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-rose-600 transition-colors hover:bg-rose-50"><Trash2 size={12} aria-hidden="true" />Delete</button>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
};

export default ReviewsAdmin;
