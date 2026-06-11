import React, { useEffect, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';

// Simple Icons as SVGs for lightweight design
const RefreshIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>;
const ExternalLinkIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>;
const CodeIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>;
const CloseIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

interface MrEvent {
	id: number;
	mr_id: number;
	mr_num: number;
	repo_name: string;
	repo_url: string;
	title: string;
	source_branch: string;
	target_branch: string;
	author: string;
	action: string;
	mr_url: string;
	payload: string;
	is_proto_change: boolean;
	interface_files: string;
	created_at: string;
}

function MrEventsList() {
	const [searchParams, setSearchParams] = useSearchParams();
	const page = parseInt(searchParams.get('page') || '1', 10) || 1;
	const repoFilter = searchParams.get('repo') || '';
	const authorFilter = searchParams.get('author') || '';

	const [items, setItems] = useState<MrEvent[]>([]);
	const [totalItems, setTotalItems] = useState(0);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(false);

	// Modal detail view state
	const [viewingEvent, setViewingEvent] = React.useState<MrEvent | null>(null);

	const fetchEvents = useCallback(() => {
		setLoading(true);
		const token = localStorage.getItem('code_shield_token');
		const headers: Record<string, string> = {};
		if (token) {
			headers['Authorization'] = `Bearer ${token}`;
		}

		const params = new URLSearchParams({
			page: page.toString(),
			pageSize: '15',
		});
		if (repoFilter) params.append('repo', repoFilter);
		if (authorFilter) params.append('author', authorFilter);

		fetch(`/proto/api/mr?${params.toString()}`, { headers })
			.then(res => {
				if (!res.ok) throw new Error('API Request Failed');
				return res.json();
			})
			.then(data => {
				setItems(data.items || []);
				setTotalItems(data.total || 0);
				setTotalPages(data.totalPages || 1);
			})
			.catch(err => {
				console.error('Failed to fetch MR events:', err);
			})
			.finally(() => {
				setLoading(false);
			});
	}, [page, repoFilter, authorFilter]);

	useEffect(() => {
		fetchEvents();
	}, [fetchEvents]);

	const handleFilterChange = (key: string, val: string) => {
		setSearchParams(prev => {
			const next = new URLSearchParams(prev);
			if (val) {
				next.set(key, val);
			} else {
				next.delete(key);
			}
			next.delete('page');
			return next;
		}, { replace: true });
	};

	const setPage = (p: number) => {
		setSearchParams(prev => {
			const next = new URLSearchParams(prev);
			if (p <= 1) {
				next.delete('page');
			} else {
				next.set('page', p.toString());
			}
			return next;
		}, { replace: true });
	};

	const getActionBadgeStyle = (action: string) => {
		let bg = 'rgba(100, 116, 139, 0.1)';
		let color = '#64748b';
		const act = action.toLowerCase();
		if (act === 'open' || act === 'create') {
			bg = 'rgba(59, 130, 246, 0.12)';
			color = '#3b82f6';
		} else if (act === 'merge' || act === 'merged') {
			bg = 'rgba(16, 185, 129, 0.12)';
			color = '#10b981';
		} else if (act === 'close' || act === 'closed') {
			bg = 'rgba(239, 68, 68, 0.12)';
			color = '#ef4444';
		} else if (act === 'update' || act === 'updated') {
			bg = 'rgba(245, 158, 11, 0.12)';
			color = '#f59e0b';
		}
		return {
			display: 'inline-flex',
			alignItems: 'center',
			padding: '0.15rem 0.5rem',
			borderRadius: '4px',
			fontSize: '0.75rem',
			fontWeight: 600,
			backgroundColor: bg,
			color: color,
		};
	};

	const formatPayload = (payload: string) => {
		try {
			const obj = JSON.parse(payload);
			return JSON.stringify(obj, null, 2);
		} catch (e) {
			return payload;
		}
	};

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', fontFamily: "'Outfit', 'Inter', sans-serif" }}>
			
			{/* Top bar with stats & filters */}
			<div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', background: 'var(--card-bg)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-color)', alignItems: 'center', justifyContent: 'space-between' }}>
				<div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
					<div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '160px' }}>
						<label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>代码仓过滤</label>
						<input
							type="text"
							placeholder="输入代码仓..."
							value={repoFilter}
							onChange={e => handleFilterChange('repo', e.target.value)}
							style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '0.85rem', background: 'var(--bg-color)', color: 'var(--text-color)' }}
						/>
					</div>
					<div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: '160px' }}>
						<label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>提交人过滤</label>
						<input
							type="text"
							placeholder="按责任人/作者..."
							value={authorFilter}
							onChange={e => handleFilterChange('author', e.target.value)}
							style={{ padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '0.85rem', background: 'var(--bg-color)', color: 'var(--text-color)' }}
						/>
					</div>
					{(repoFilter || authorFilter) && (
						<button
							onClick={() => setSearchParams(new URLSearchParams(), { replace: true })}
							style={{
								background: 'transparent',
								border: '1px solid var(--border-color)',
								padding: '0.45rem 1rem',
								borderRadius: '6px',
								fontSize: '0.85rem',
								color: '#64748b',
								cursor: 'pointer',
								marginTop: '1.1rem',
								display: 'inline-flex',
								alignItems: 'center',
								gap: '0.35rem',
								transition: 'all 0.2s'
							}}
							onMouseEnter={e => {
								e.currentTarget.style.borderColor = 'var(--primary-color)';
								e.currentTarget.style.color = 'var(--primary-color)';
							}}
							onMouseLeave={e => {
								e.currentTarget.style.borderColor = 'var(--border-color)';
								e.currentTarget.style.color = '#64748b';
							}}
						>
							<RefreshIcon />
							重置
						</button>
					)}
				</div>

				<div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
					<span style={{ fontSize: '0.85rem', color: '#64748b' }}>
						共计收到 <strong>{totalItems}</strong> 个推送事件
					</span>
					<button
						onClick={fetchEvents}
						style={{
							background: 'var(--primary-color)',
							color: 'white',
							border: 'none',
							padding: '0.5rem 1rem',
							borderRadius: '6px',
							fontSize: '0.85rem',
							fontWeight: 600,
							cursor: 'pointer',
							display: 'inline-flex',
							alignItems: 'center',
							gap: '0.4rem',
							transition: 'opacity 0.2s'
						}}
						onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
						onMouseLeave={e => e.currentTarget.style.opacity = '1'}
					>
						<RefreshIcon />
						刷新列表
					</button>
				</div>
			</div>

			{/* Main Table Card */}
			<div className="card" style={{ padding: 0, fontSize: '0.875rem', overflow: 'hidden' }}>
				{loading ? (
					<div style={{ padding: '6rem', textAlign: 'center', color: '#64748b' }}>
						<div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid rgba(59,130,246,0.15)', borderTopColor: 'var(--primary-color)', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
						数据加载中，请稍候...
						<style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
					</div>
				) : (
					<table className="table">
						<thead>
							<tr>
								<th style={{ width: '60px' }}>序号</th>
								<th style={{ width: '180px' }}>代码仓</th>
								<th>Merge Request 推送标题</th>
								<th style={{ width: '100px' }}>接口变更</th>
								<th style={{ width: '130px' }}>源分支</th>
								<th style={{ width: '130px' }}>目标分支</th>
								<th style={{ width: '100px' }}>推送者</th>
								<th style={{ width: '100px' }}>推送动作</th>
								<th style={{ width: '150px' }}>事件接收时间</th>
								<th style={{ width: '80px' }}>Payload</th>
							</tr>
						</thead>
						<tbody>
							{items.length === 0 ? (
								<tr>
									<td colSpan={10} style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
										暂无华为 CodeArts MR 推送事件记录。
									</td>
								</tr>
							) : (
								items.map((item, idx) => (
									<tr key={item.id}>
										<td style={{ color: '#94a3b8', fontWeight: 500 }}>
											#{(page - 1) * 15 + idx + 1}
										</td>
										<td style={{ fontWeight: 500 }}>
											{item.repo_url ? (
												<a
													href={item.repo_url}
													target="_blank"
													rel="noreferrer"
													style={{ color: 'var(--primary-color)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
													onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
													onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
													title={item.repo_url}
												>
													<span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.repo_name}</span>
													<ExternalLinkIcon />
												</a>
											) : (
												item.repo_name
											)}
										</td>
										<td>
											{item.mr_url ? (
												<a
													href={item.mr_url}
													target="_blank"
													rel="noreferrer"
													style={{ color: 'var(--text-color)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
													onMouseEnter={e => e.currentTarget.style.color = 'var(--primary-color)'}
													onMouseLeave={e => e.currentTarget.style.color = 'var(--text-color)'}
													title="查看 CodeArts 原本合并请求"
												>
													<span>{item.title || `合并请求 #${item.mr_num}`}</span>
													<ExternalLinkIcon />
												</a>
											) : (
												<span style={{ fontWeight: 600 }}>{item.title || `合并请求 #${item.mr_num}`}</span>
											)}
										</td>
										<td>
											<div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', alignItems: 'flex-start' }}>
												{item.is_proto_change ? (
													<span style={{ 
														display: 'inline-flex', 
														alignItems: 'center', 
														padding: '0.15rem 0.5rem', 
														borderRadius: '4px', 
														fontSize: '0.72rem', 
														fontWeight: 700, 
														backgroundColor: 'rgba(16, 185, 129, 0.15)', 
														color: '#10b981',
														border: '1px solid rgba(16, 185, 129, 0.3)',
														boxShadow: '0 0 8px rgba(16, 185, 129, 0.1)'
													}}>
														接口变更
													</span>
												) : (
													<span style={{ 
														display: 'inline-flex', 
														alignItems: 'center', 
														padding: '0.15rem 0.5rem', 
														borderRadius: '4px', 
														fontSize: '0.72rem', 
														fontWeight: 500, 
														backgroundColor: 'rgba(255, 255, 255, 0.03)', 
														color: 'var(--text-secondary)',
														border: '1px solid var(--border-color)'
													}}>
														普通
													</span>
												)}
												{item.is_proto_change && item.interface_files && (() => {
													try {
														const files = JSON.parse(item.interface_files);
														if (files && files.length > 0) {
															return (
																<div 
																	style={{ 
																		fontSize: '0.68rem', 
																		color: '#10b981', 
																		opacity: 0.85, 
																		fontFamily: 'monospace', 
																		maxWidth: '120px', 
																		overflow: 'hidden', 
																		textOverflow: 'ellipsis', 
																		whiteSpace: 'nowrap',
																		cursor: 'help'
																	}} 
																	title={`接口相关变更文件：\n${files.join('\n')}`}
																>
																	{files.length === 1 ? files[0] : `${files[0]} 等 ${files.length} 个文件`}
																</div>
															);
														}
													} catch (e) {}
													return null;
												})()}
											</div>
										</td>
										<td>
											<span style={{ fontFamily: 'monospace', background: 'var(--bg-color)', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.78rem' }}>{item.source_branch}</span>
										</td>
										<td>
											<span style={{ fontFamily: 'monospace', background: 'var(--bg-color)', padding: '0.15rem 0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.78rem' }}>{item.target_branch}</span>
										</td>
										<td>{item.author}</td>
										<td>
											<span style={getActionBadgeStyle(item.action)}>
												{item.action.toUpperCase()}
											</span>
										</td>
										<td style={{ color: '#64748b' }}>
											{item.created_at ? item.created_at.replace('T', ' ').substring(0, 19) : '-'}
										</td>
										<td>
											<button
												onClick={() => setViewingEvent(item)}
												style={{
													background: 'transparent',
													border: 'none',
													cursor: 'pointer',
													padding: '0.35rem',
													borderRadius: '4px',
													color: 'var(--primary-color)',
													display: 'flex',
													alignItems: 'center',
													justifyContent: 'center',
													transition: 'background-color 0.2s'
												}}
												title="查看原始 JSON"
												onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.08)'}
												onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
											>
												<CodeIcon />
											</button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				)}
			</div>

			{/* Pagination Footer */}
			{totalPages > 1 && (
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', padding: '0.5rem', background: 'var(--card-bg)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
					<span style={{ fontSize: '0.85rem', color: 'var(--text-color)' }}>
						当前第 {page} / {totalPages} 页
					</span>
					<div style={{ display: 'flex', gap: '0.5rem' }}>
						<button
							disabled={page === 1}
							onClick={() => setPage(page - 1)}
							style={{
								padding: '0.35rem 0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)',
								background: page === 1 ? 'var(--bg-color)' : 'var(--card-bg)',
								color: page === 1 ? '#94a3b8' : 'var(--text-color)',
								cursor: page === 1 ? 'not-allowed' : 'pointer',
								fontSize: '0.825rem'
							}}
						>
							上一页
						</button>
						<button
							disabled={page >= totalPages}
							onClick={() => setPage(page + 1)}
							style={{
								padding: '0.35rem 0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)',
								background: page >= totalPages ? 'var(--bg-color)' : 'var(--card-bg)',
								color: page >= totalPages ? '#94a3b8' : 'var(--text-color)',
								cursor: page >= totalPages ? 'not-allowed' : 'pointer',
								fontSize: '0.825rem'
							}}
						>
							下一页
						</button>
					</div>
				</div>
			)}

			{/* Modal Detail Payload View */}
			{viewingEvent !== null && (
				<div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
					<div style={{ width: '750px', maxWidth: '90vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
						<div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
							<h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-color)' }}>原始 Webhook JSON Payload</h3>
							<button
								onClick={() => setViewingEvent(null)}
								style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
							>
								<CloseIcon />
							</button>
						</div>
						<div style={{ flex: 1, overflow: 'auto', padding: '1.5rem', background: '#0f172a' }}>
							{viewingEvent.is_proto_change && viewingEvent.interface_files && (() => {
								try {
									const files = JSON.parse(viewingEvent.interface_files);
									if (files && files.length > 0) {
										return (
											<div style={{ 
												marginBottom: '1.25rem', 
												padding: '0.85rem 1rem', 
												borderRadius: '8px', 
												background: 'rgba(16, 185, 129, 0.08)', 
												border: '1px solid rgba(16, 185, 129, 0.2)',
												color: '#10b981',
												fontSize: '0.825rem',
												textAlign: 'left'
											}}>
												<strong style={{ display: 'block', marginBottom: '0.45rem', color: '#10b981', fontSize: '0.85rem' }}>⚡ 接口相关变更文件：</strong>
												<div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontFamily: 'monospace', fontSize: '0.76rem' }}>
													{files.map((f: string, idx: number) => (
														<div key={idx} style={{ paddingLeft: '0.5rem', borderLeft: '2px solid #10b981' }}>{f}</div>
													))}
												</div>
											</div>
										);
									}
								} catch(e) {}
								return null;
							})()}
							<pre style={{ margin: 0, color: '#38bdf8', fontSize: '0.8rem', fontFamily: "monospace", textAlign: 'left', lineHeight: 1.4 }}>
								<code>{formatPayload(viewingEvent.payload)}</code>
							</pre>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

interface AppProps {
	isEmbedded?: boolean;
}

function AppContent() {
	return (
		<Routes>
			<Route path="/" element={<Navigate to="mr" replace />} />
			<Route path="mr" element={<MrEventsList />} />
		</Routes>
	);
}

export default function App({ isEmbedded = false }: AppProps) {
	const isEmbeddedMode = isEmbedded || !!(window as any).__POWERED_BY_PORTAL__;
	
	if (isEmbeddedMode) {
		return <AppContent />;
	}

	return (
		<BrowserRouter>
			<div style={{ padding: '2rem', minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-color)' }}>
				<header style={{ marginBottom: '2rem' }}>
					<h1 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 700 }}>接口管理系统 (Proto)</h1>
				</header>
				<main>
					<AppContent />
				</main>
			</div>
		</BrowserRouter>
	);
}
