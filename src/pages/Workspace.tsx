import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Markdown from 'react-markdown';
import { GoogleGenAI, Type } from "@google/genai";
import { getGeminiAPI, getSystemPrompt, getGeminiTools } from '../services/aiService';
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider, microsoftProvider, db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, query, where, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

export default function Workspace() {
  const [tasks, setTasks] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('local_tasks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month'>('day');
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [activeCountdown, setActiveCountdown] = useState<{ id: string, remainingSeconds: number } | null>(null);
  const [newTask, setNewTask] = useState({ title: '', description: '', startTime: '', endTime: '' });
  const [errorMsg, setErrorMsg] = useState("");
  const [notification, setNotification] = useState<{title: string, message: string} | null>(null);
  const [integrations, setIntegrations] = useState({ email: false, outlook: false, linkedin: false });
  const [mobileTab, setMobileTab] = useState<'calendar' | 'chat' | 'notifications'>('calendar');
  const [appNotifications, setAppNotifications] = useState<any[]>([]);
  const [selectedNotificationForReply, setSelectedNotificationForReply] = useState<any>(null);
  const [replyDraft, setReplyDraft] = useState<string>('');
  const [isGeneratingReply, setIsGeneratingReply] = useState<boolean>(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });

  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [hubWidth, setHubWidth] = useState(320);
  const [isResizingHub, setIsResizingHub] = useState(false);

  useEffect(() => {
    if (!isResizing && !isResizingHub) {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      return;
    }
    
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
       if (isResizing) {
         setSidebarWidth(prev => {
            let newWidth = e.clientX;
            if (newWidth < 250) newWidth = 250;
            if (newWidth > 800) newWidth = 800; // max reasonable width
            return newWidth;
         });
       } else if (isResizingHub) {
         setHubWidth(prev => {
            let newWidth = window.innerWidth - e.clientX;
            if (newWidth < 250) newWidth = 250;
            if (newWidth > 800) newWidth = 800;
            return newWidth;
         });
       }
    };
    const handleMouseUp = () => {
      setIsResizing(false);
      setIsResizingHub(false);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  }, [isResizing, isResizingHub]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isDemo = searchParams.get('demo') === 'true';

  useEffect(() => {
    let unsubscribe = () => {};
    if (isGoogleLoggedIn && auth.currentUser) {
      const q = query(collection(db, 'tasks'), where('userId', '==', auth.currentUser.uid));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTasks(data);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'tasks');
      });
    } else {
      const saved = localStorage.getItem('local_tasks');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setTasks(parsed);
          }
        } catch {
          // ignore
        }
      }
    }
    return () => unsubscribe();
  }, [isGoogleLoggedIn]);

  useEffect(() => {
    try {
      localStorage.setItem('local_tasks', JSON.stringify(tasks));
    } catch {
      // ignore
    }
  }, [tasks]);

  useEffect(() => {
    let timer: any;
    if (activeCountdown && activeCountdown.remainingSeconds > 0) {
      timer = setInterval(() => {
        setActiveCountdown(prev => prev ? { ...prev, remainingSeconds: prev.remainingSeconds - 1 } : null);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeCountdown]);

  // Real-time task start checking
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      tasks.forEach(task => {
        if (task.status === "PINNED") {
          const diff = task.startTime - now;
          if (diff > 0 && diff <= 60000 && !task.notified) {
            setNotification({ title: "Đến giờ thực hiện", message: `Task: ${task.title}` });
            task.notified = true; // Mutating safely locally to avoid infinite loops, or just update state
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, notified: true } : t));
          }
        }
      });
    }, 10000);
    return () => clearInterval(timer);
  }, [tasks]);

  // Polling app messages (MOCK integration for Email/Outlook/LinkedIn)

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light');
    } else {
      document.body.classList.remove('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsGoogleLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      if (isGoogleLoggedIn) {
         await signOut(auth);
         localStorage.removeItem('gmailAccessToken');
         setIntegrations(prev => ({...prev, email: false}));
      } else {
         const result = await signInWithPopup(auth, googleProvider);
         import("firebase/auth").then(({ GoogleAuthProvider }) => {
            const credential = GoogleAuthProvider.credentialFromResult(result);
            if (credential?.accessToken) {
               localStorage.setItem('gmailAccessToken', credential.accessToken);
               setIntegrations(prev => ({...prev, email: true}));
            }
         });
      }
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        // User closed the popup, safe to ignore
        return;
      }
      console.error("Firebase auth error:", error);
    }
  };

  const handleOutlookConnect = async () => {
    try {
      if (integrations.outlook) {
         localStorage.removeItem('outlookAccessToken');
         setIntegrations(prev => ({...prev, outlook: false}));
      } else {
         const result = await signInWithPopup(auth, microsoftProvider);
         import("firebase/auth").then(({ OAuthProvider }) => {
            const credential = OAuthProvider.credentialFromResult(result);
            if (credential?.accessToken) {
               localStorage.setItem('outlookAccessToken', credential.accessToken);
               setIntegrations(prev => ({...prev, outlook: true}));
            }
         });
      }
    } catch (error: any) {
       if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
         // User closed the popup, safe to ignore
         return;
       }
       console.error("Microsoft auth error:", error);
    }
  };

  const handlePrevDate = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (calendarView === 'day') {
        d.setDate(d.getDate() - 1);
      } else if (calendarView === 'week') {
        d.setDate(d.getDate() - 7);
      } else {
        d.setDate(1);
        d.setMonth(d.getMonth() - 1);
      }
      return d;
    });
  };

  const handleNextDate = () => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (calendarView === 'day') {
        d.setDate(d.getDate() + 1);
      } else if (calendarView === 'week') {
        d.setDate(d.getDate() + 7);
      } else {
        d.setDate(1);
        d.setMonth(d.getMonth() + 1);
      }
      return d;
    });
  };

  useEffect(() => {
    const fetchEmails = async () => {
      const token = localStorage.getItem('gmailAccessToken');
      if (!token) {
        return;
      }
      try {
        const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20&q=is:unread&includeSpamTrash=true', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (!res.ok) {
           if (res.status === 401) {
              // Token expired
              localStorage.removeItem('gmailAccessToken');
           }
           return;
        }
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          const emailPromises = data.messages.map(async (msg: any) => {
            const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const msgData = await msgRes.json();
            const subjectHeader = msgData.payload?.headers?.find((h: any) => h.name === 'Subject');
            const fromHeader = msgData.payload?.headers?.find((h: any) => h.name === 'From');
            const messageIdHeader = msgData.payload?.headers?.find((h: any) => h.name === 'Message-ID');
            return {
              id: msgData.id,
              threadId: msgData.threadId,
              messageId: messageIdHeader ? messageIdHeader.value : '',
              type: 'mail',
              source: 'GMAIL',
              from: fromHeader ? fromHeader.value : 'Unknown',
              title: subjectHeader ? subjectHeader.value : 'No Subject',
              snippet: msgData.snippet || 'No snippet',
              time: 'Recent'
            };
          });
          const emails = await Promise.all(emailPromises);
          
          setAppNotifications(prev => {
            // Check if we have new emails not in prev to trigger notification
            const currentIds = new Set(prev.map(n => n.id));
            const newEmails = emails.filter(e => e.id && !currentIds.has(e.id) && !String(e.id).startsWith('mock'));
            if (newEmails.length > 0) {
               setNotification({ title: "Thông báo mới", message: "Bạn có email mới từ Gmail." });
            }
            // Merge previously fetched to avoid missing emails if user has many unread
            const allEmails = [...newEmails, ...prev.filter(p => !emails.some(e => e.id === p.id))];
            return allEmails.slice(0, 50); // Keep max 50 in state
          });
        }
      } catch (e: any) {
        if (e.name === 'TypeError' && e.message === 'Failed to fetch') {
           console.warn("Could not fetch emails. Network or CORS error.");
        } else {
           console.warn("Could not fetch emails:", e.message);
        }
      }
    };

    const fetchOutlookEmails = async () => {
      const token = localStorage.getItem('outlookAccessToken');
      if (!token) return;
      try {
        // me/messages searches all folders including junk/deleted
        const res = await fetch('https://graph.microsoft.com/v1.0/me/messages?$filter=isRead eq false&$top=20&$orderby=receivedDateTime desc', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (!res.ok) {
           if (res.status === 401) {
              localStorage.removeItem('outlookAccessToken');
           }
           return;
        }
        const data = await res.json();
        if (data.value && data.value.length > 0) {
          const emails = data.value.map((msg: any) => {
            return {
              id: msg.id,
              threadId: msg.conversationId,
              messageId: msg.internetMessageId || '',
              type: 'mail',
              source: 'OUTLOOK',
              from: msg.from?.emailAddress?.name ? `${msg.from.emailAddress.name} <${msg.from.emailAddress.address}>` : (msg.from?.emailAddress?.address || 'Unknown'),
              title: msg.subject || 'No Subject',
              snippet: msg.bodyPreview || 'No snippet',
              time: 'Recent'
            };
          });
          
          setAppNotifications(prev => {
            const currentIds = new Set(prev.map(n => n.id));
            const newEmails = emails.filter((e: any) => e.id && !currentIds.has(e.id) && !String(e.id).startsWith('mock'));
            if (newEmails.length > 0) {
               setNotification({ title: "Thông báo mới", message: "Bạn có email mới từ Outlook." });
            }
            const allEmails = [...newEmails, ...prev.filter(p => !emails.some((e: any) => e.id === p.id))];
            return allEmails.slice(0, 50);
          });
        }
      } catch (e: any) {
         console.warn("Could not fetch outlook emails:", e.message);
      }
    };

    const pollMails = () => {
       fetchEmails();
       fetchOutlookEmails();
    };

    pollMails(); // Fetch immediately
    const pollTimer = setInterval(pollMails, 20000); // Poll every 20s
    return () => clearInterval(pollTimer);
  }, []);

  const handleSendMessage = async (text: string = inputValue) => {
    if (!text.trim()) return;
    setInputValue("");
    
    const newMessages = [...chatMessages, { role: 'user', content: text }];
    setChatMessages([...newMessages, { role: 'model', content: '' }]);

    try {
      const ai = getGeminiAPI();
      const stream = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: getSystemPrompt(tasks, ["test"], Intl.DateTimeFormat().resolvedOptions().timeZone, new Date().toString()),
          tools: getGeminiTools()
        },
        contents: newMessages.filter(m => m.content).map(m => ({ role: m.role, parts: [{ text: m.content }] }))
      });

      let responseText = "";

      for await (const chunk of stream) {
        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
          for (const call of chunk.functionCalls) {
            let toolActionText = "";
            if (call.name === "manage_tasks" && call.args && Array.isArray(call.args.tasks)) {
              const parseSafeTimestamp = (val: any, fallbackMs: number): number => {
                if (typeof val === 'number' && !isNaN(val) && val > 0) return Math.floor(val);
                if (typeof val === 'string' && val.trim()) {
                  const num = Number(val);
                  if (!isNaN(num) && num > 1000000000) return Math.floor(num);
                  const parsed = new Date(val).getTime();
                  if (!isNaN(parsed)) return parsed;
                }
                return fallbackMs;
              };

              const newTasks = call.args.tasks.map((t: any, idx: number) => {
                const rawStart = t.startTime || t.start_iso || t.start || t.start_time;
                const rawEnd = t.endTime || t.end_iso || t.end || t.end_time;

                const defaultStart = Date.now() + (idx + 1) * 3600 * 1000;
                const startMs = parseSafeTimestamp(rawStart, defaultStart);
                let endMs = parseSafeTimestamp(rawEnd, startMs + 60 * 60 * 1000);
                if (endMs <= startMs) {
                  endMs = startMs + 60 * 60 * 1000;
                }

                return {
                  id: t.id && typeof t.id === 'string' && /^[a-zA-Z0-9_-]+$/.test(t.id) ? t.id : Math.random().toString(36).substring(2, 11),
                  title: String(t.title || "Công việc mới").trim().slice(0, 300),
                  description: String(t.description || t.notes || "").slice(0, 2000),
                  startTime: startMs,
                  endTime: endMs,
                  status: "DRAFT",
                  priority: Number(t.priority) || 2,
                  userId: auth.currentUser?.uid || "demo",
                  createdAt: Date.now()
                };
              });

              // Check REAL schedule conflicts against existing tasks
              const conflicts: { task: any; conflictingWith: any }[] = [];
              const nonConflictingTasks: any[] = [];

              for (const task of newTasks) {
                const conflict = tasks.find(existing => {
                  if (existing.id === task.id || existing.status === 'REJECTED') return false;
                  return task.startTime < existing.endTime && task.endTime > existing.startTime;
                });

                if (conflict) {
                  conflicts.push({ task, conflictingWith: conflict });
                } else {
                  nonConflictingTasks.push(task);
                }
              }

              const addedTasks: any[] = [];
              for (const task of nonConflictingTasks) {
                if (auth.currentUser) {
                  try {
                    task.userId = auth.currentUser.uid;
                    await setDoc(doc(db, 'tasks', task.id), task);
                  } catch (e: any) {
                    console.warn("Firestore save fallback to local state:", e);
                    handleFirestoreError(e, OperationType.CREATE, 'tasks/' + task.id);
                  }
                }
                addedTasks.push(task);
              }

              if (addedTasks.length > 0) {
                setTasks(prev => {
                  const existingIds = new Set(prev.map(p => p.id));
                  const uniqueNew = addedTasks.filter((t: any) => !existingIds.has(t.id));
                  return [...prev, ...uniqueNew];
                });
              }

              if (conflicts.length > 0) {
                const conflictDetails = conflicts.map(c => 
                  `- **"${c.task.title}"** trùng khung giờ với **"${c.conflictingWith.title}"** (${new Date(c.conflictingWith.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(c.conflictingWith.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                ).join('\n');
                
                let msg = `⚠️ **Cảnh báo xung đột thời gian:**\n\n${conflictDetails}\n\n`;
                if (addedTasks.length > 0) {
                  const taskSummary = addedTasks.map((t: any) => {
                    const dateObj = new Date(t.startTime);
                    const dateStr = `Ngày ${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
                    const start = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const end = new Date(t.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return `- **${dateStr}, ${start} - ${end}**: ${t.title}`;
                  }).join('\n');
                  msg += `Các lịch khác đã được xếp thành công:\n${taskSummary}\n\n`;
                }
                msg += `Bạn có muốn tôi tìm khoảng thời gian trống khác cho các mục bị trùng không?`;
                toolActionText = msg;
              } else if (addedTasks.length > 0) {
                const taskSummary = addedTasks.map((t: any) => {
                  const dateObj = new Date(t.startTime);
                  const dateStr = `Ngày ${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
                  const start = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const end = new Date(t.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return `- **${dateStr}, ${start} - ${end}**: ${t.title}`;
                }).join('\n');
                
                toolActionText = `Mình đã lên lịch thành công cho bạn:\n${taskSummary}\n\nBạn có thể kiểm tra trên lịch và chỉnh sửa hoặc ghim (PIN) lại nhé.`;
              } else {
                toolActionText = `Không có lịch mới nào cần thêm.`;
              }
            } else if (call.name === "update_task" && call.args) {
              const { id, title, startTime, endTime, status } = call.args;
              const updatePayload: any = {};
              if (title) updatePayload.title = title;
              if (startTime) {
                const s = new Date(startTime as string).getTime();
                if (!isNaN(s)) updatePayload.startTime = s;
              }
              if (endTime) {
                const e = new Date(endTime as string).getTime();
                if (!isNaN(e)) updatePayload.endTime = e;
              }
              if (status) updatePayload.status = status;
              
              if (auth.currentUser) {
                 try {
                   await updateDoc(doc(db, 'tasks', id as string), updatePayload);
                 } catch (e) {
                   handleFirestoreError(e, OperationType.UPDATE, 'tasks/' + id);
                 }
              }
              setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updatePayload } : t));
              toolActionText = `Đã cập nhật công việc.`;
            } else if (call.name === "delete_task" && call.args) {
               const { id } = call.args;
               if (auth.currentUser) {
                  try {
                    await deleteDoc(doc(db, 'tasks', id as string));
                  } catch (e) {
                    handleFirestoreError(e, OperationType.DELETE, 'tasks/' + id);
                  }
               }
               setTasks(prev => prev.filter(t => t.id !== id));
               toolActionText = `Đã xoá công việc khỏi lịch.`;
            } else if (call.name === "save_user_habit" && call.args) {
               const { habitDescription } = call.args;
               if (auth.currentUser) {
                  try {
                    const userRef = doc(db, 'users', auth.currentUser.uid);
                    await setDoc(userRef, {
                      habits: [habitDescription]  // Simplification: overwriting or we could use arrayUnion
                    }, { merge: true });
                  } catch (e) {
                    handleFirestoreError(e, OperationType.UPDATE, 'users/' + auth.currentUser.uid);
                  }
               }
               toolActionText = `Tôi đã ghi nhớ thói quen này: ${habitDescription}`;
            }
            
            if (toolActionText) {
               responseText += toolActionText + "\n\n";
               setChatMessages(prev => {
                 const temp = [...prev];
                 temp[temp.length - 1].content = responseText;
                 return temp;
               });
            }
          }
        }
        if (chunk.text) {
          responseText += chunk.text;
          setChatMessages(prev => {
            const temp = [...prev];
            temp[temp.length - 1].content = responseText;
            return temp;
          });
        }
      }
    } catch (e: any) {
      if (e.message !== 'Failed to fetch') {
        console.error(e);
      }
      setChatMessages(prev => {
        const temp = [...prev];
        temp[temp.length - 1].content = 'Error connecting to AI: ' + (e.message || String(e));
        return temp;
      });
    }
  };

  const handleCreateTask = async () => {
    setErrorMsg("");
    try {
      if (!auth.currentUser) {
         setErrorMsg("Bạn cần đăng nhập để thực hiện.");
         return;
      }
      const task = {
          id: Math.random().toString(36).substr(2, 9),
          title: newTask.title,
          description: newTask.description,
          startTime: new Date(newTask.startTime).getTime(),
          endTime: new Date(newTask.endTime).getTime(),
          status: "PINNED",
          priority: 1,
          createdAt: Date.now(),
          userId: auth.currentUser.uid
      };
      const conflicts = tasks.filter(t => 
        t.status !== "REJECTED" && t.status !== "DONE" &&
        ((task.startTime >= t.startTime && task.startTime < t.endTime) || 
        (task.endTime > t.startTime && task.endTime <= t.endTime) ||
        (task.startTime <= t.startTime && task.endTime >= t.endTime))
      );

      if (conflicts.length > 0) {
        const conflictNames = conflicts.map((t: any) => t.title).join(', ');
        const expectedDurationInMinutes = Math.round((task.endTime - task.startTime) / 60000);
        setChatMessages(prev => [...prev, {
          role: 'model',
          content: `⚠️ **Cảnh báo xung đột:** \n\nTôi phát hiện lịch "${newTask.title}" (dự kiến ${expectedDurationInMinutes} phút) bạn vừa thêm bị trùng thời gian với: **${conflictNames}**. Việc thêm mới tạm thời bị hủy để tránh trùng lịch.\n\nBạn có muốn tôi tìm khoảng thời gian trống khác và tự động xếp lịch lại cho việc "${newTask.title}" không?`,
          id: Date.now().toString()
        }]);
        setShowTaskForm(false);
        setNewTask({ title: '', description: '', startTime: '', endTime: '' });
        return;
      }

      await setDoc(doc(db, 'tasks', task.id), task);
      setShowTaskForm(false);
      setNewTask({ title: '', description: '', startTime: '', endTime: '' });
    } catch (e: any) {
      console.warn("Failed to create task", e);
      if (e.message && e.message.includes('OperationType')) {
        // Ignored since we know handleFirestoreError formats it
      } else {
        handleFirestoreError(e, OperationType.CREATE, 'tasks');
      }
    }
  };

  const updateTaskStatus = async (id: string, status: string) => {
    try {
      if (!auth.currentUser) return;
      await updateDoc(doc(db, 'tasks', id), { status });
      setSelectedTask(null);
    } catch (e) {
      console.warn(e);
      handleFirestoreError(e, OperationType.UPDATE, 'tasks/' + id);
    }
  }

  const deleteTask = async (id: string) => {
    try {
      if (!auth.currentUser) return;
      await deleteDoc(doc(db, 'tasks', id));
      setSelectedTask(null);
    } catch (e) {
      console.warn(e);
      handleFirestoreError(e, OperationType.DELETE, 'tasks/' + id);
    }
  }

  const formatCountdown = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  const handleGenerateSuggestedReply = async (notif: any) => {
    setSelectedNotificationForReply(notif);
    setIsGeneratingReply(true);
    setReplyDraft("");

    try {
      const prompt = `Viết một email phản hồi cho email sau: \nTiêu đề: ${notif.title}\nNội dung: ${notif.snippet}\n\nYêu cầu: Viết chuyên nghiệp, ngắn gọn và sẵn sàng để gửi. Chỉ trả về nội dung email, không cần giải thích thêm.`;
      
      const ai = getGeminiAPI();
      const stream = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      let text = "";
      for await (const chunk of stream) {
        if (chunk.text) {
          text += chunk.text;
          setReplyDraft(text);
        }
      }
    } catch (e: any) {
      console.error(e);
      setReplyDraft("Lỗi AI khi tạo nháp: " + String(e));
    } finally {
      setIsGeneratingReply(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedNotificationForReply || !replyDraft || selectedNotificationForReply.source !== 'GMAIL') {
       // Currently only supporting GMAIL
       return;
    }
    const token = localStorage.getItem('gmailAccessToken');
    if (!token) return;

    try {
      setIsGeneratingReply(true);
      
      const to = selectedNotificationForReply.from; // Contains "Name <email>"
      
      // Need to clean headers up and build raw RFC 2822
      const subject = selectedNotificationForReply.title.startsWith('Re:') ? selectedNotificationForReply.title : `Re: ${selectedNotificationForReply.title}`;
      
      const emailLines = [];
      emailLines.push(`To: ${to}`);
      emailLines.push(`Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`);
      if (selectedNotificationForReply.messageId) {
         emailLines.push(`In-Reply-To: ${selectedNotificationForReply.messageId}`);
         emailLines.push(`References: ${selectedNotificationForReply.messageId}`);
      }
      emailLines.push('Content-Type: text/plain; charset="UTF-8"');
      emailLines.push('');
      emailLines.push(replyDraft);

      const email = emailLines.join('\r\n');
      
      // Base64URL encode the email
      const encodedEmail = btoa(unescape(encodeURIComponent(email)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          raw: encodedEmail,
          threadId: selectedNotificationForReply.threadId || undefined
        })
      });

      if (!res.ok) {
        throw new Error('Failed to send reply');
      }

      setNotification({ title: 'Thành công', message: 'Đã gửi phản hồi thành công.' });
      setReplyDraft('');
      setSelectedNotificationForReply(null);
    } catch (error) {
      console.error(error);
      setNotification({ title: 'Lỗi', message: 'Không thể gửi email.' });
    } finally {
      setIsGeneratingReply(false);
    }
  };

  const renderCalendarContent = () => {
    if (calendarView === 'day') {
      return (
        <div className="flex relative w-full pt-4">
          <div className="w-16 flex-shrink-0 flex flex-col items-end pr-2 border-r border-border-color relative">
            {[...Array(24)].map((_, hour) => (
              <div key={hour} className={`h-24 relative w-full text-right ${hour > 0 ? 'border-t border-border-color' : ''}`}>
                <span className="font-mono text-[11px] font-semibold tracking-[0.1em] text-outline-variant absolute -top-2 right-2">
                  {hour.toString().padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>
          <div className="flex-1 relative min-h-[2304px] pl-2 pr-4">
            <div className="absolute w-full h-px bg-accent-red top-0 z-10 left-0" style={{top: `${(new Date().getHours() * 60 + new Date().getMinutes()) / 60 * 96}px`}}>
              <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-accent-red border-2 border-bg-dark"></div>
            </div>
            {tasks.filter((task: any) => {
              const startDt = new Date(task.startTime);
              const today = new Date(currentDate);
              return startDt.getDate() === today.getDate() && startDt.getMonth() === today.getMonth() && startDt.getFullYear() === today.getFullYear();
            }).map((task: any) => {
              const startDt = new Date(task.startTime);
              const endDt = new Date(task.endTime);
              const startHour = startDt.getHours();
              const startMin = startDt.getMinutes();
              const endHour = endDt.getHours();
              const endMin = endDt.getMinutes();
              
              const topMinutes = startHour * 60 + startMin;
              const topPx = (topMinutes / 60) * 96; 
              const durationMinutes = ((endHour - startHour) * 60) + (endMin - startMin);
              const heightPx = Math.max((durationMinutes / 60) * 96, 24);
              
              let bgClass = "bg-surface-bright";
              let borderClass = "border-border-color";
              let textClass = "text-on-surface";
              let tagBg = "";

              if (task.status === "PINNED") {
                bgClass = "bg-accent-green/10";
                borderClass = "border-accent-green cursor-pointer hover:bg-accent-green/20";
                textClass = "text-accent-green";
                tagBg = "bg-accent-green/20 border-accent-green/30 text-accent-green";
              } else if (task.status === "DRAFT") {
                bgClass = "bg-accent-blue/5";
                borderClass = "border-dashed border-accent-blue cursor-pointer hover:bg-accent-blue/10";
                textClass = "text-accent-blue";
                tagBg = "bg-accent-blue/10 border-accent-blue/30 text-accent-blue";
              } else if (task.status === "DONE") {
                bgClass = "bg-surface-dim opacity-50";
                borderClass = "border-border-color cursor-pointer hover:bg-surface-bright";
                textClass = "text-on-surface-variant line-through";
                tagBg = "bg-surface-bright border-border-color text-on-surface-variant";
              }

              const isCounting = activeCountdown?.id === task.id;

              return (
                <div 
                  key={task.id} 
                  onClick={() => setSelectedTask(task)}
                  className={`absolute left-2 right-4 rounded p-2 z-0 border transition-colors ${bgClass} ${borderClass}`}
                  style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`font-mono text-[9px] font-semibold uppercase tracking-[0.15em] px-1 py-0.5 rounded border ${tagBg}`}>
                      {task.status}
                    </span>
                    <span className="font-mono text-[11px] font-semibold tracking-[0.1em] text-on-surface-variant flex items-center gap-2">
                       {isCounting && <span className="text-accent-red font-bold">{formatCountdown(activeCountdown.remainingSeconds)}</span>}
                      {startHour.toString().padStart(2, '0')}:{startMin.toString().padStart(2, '0')} - {endHour.toString().padStart(2, '0')}:{endMin.toString().padStart(2, '0')}
                    </span>
                  </div>
                  <h3 className="font-sans text-sm text-on-surface font-semibold truncate flex items-center gap-2">
                    {task.priority === 1 ? <span className="material-symbols-outlined text-accent-red text-[16px]">priority_high</span> : null}
                    {task.title}
                  </h3>
                  {task.description && <p className="font-mono text-[13px] text-on-surface-variant truncate mt-1">{task.description}</p>}
                </div>
              );
            })}
          </div>
        </div>
      );
    } else if (calendarView === 'week') {
      return (
        <div className="flex flex-col relative w-full pt-2">
          {/* Week Header */}
          <div className="flex relative w-full mb-2 sticky top-0 z-20 bg-bg-dark border-b border-border-color pb-2">
            <div className="w-12 shrink-0"></div>
            <div className="flex-1 grid grid-cols-7">
              {[...Array(7)].map((_, col) => {
                 const today = new Date(currentDate);
                 const currentDayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1;
                 const diff = col - currentDayOfWeek;
                 const dateOfCol = new Date(today);
                 dateOfCol.setDate(today.getDate() + diff);
                 const dayName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][col];
                 const isToday = new Date().getDate() === dateOfCol.getDate() && new Date().getMonth() === dateOfCol.getMonth() && new Date().getFullYear() === dateOfCol.getFullYear();

                 return (
                   <div key={col} className={`text-center font-mono flex flex-col ${isToday ? 'text-primary' : 'text-on-surface-variant'}`}>
                     <span className="text-[11px] font-bold uppercase">{dayName}</span>
                     <span className={`text-[10px] mt-1 ${isToday ? 'bg-primary text-bg-dark rounded-full w-5 h-5 flex items-center justify-center self-center mx-auto' : ''}`}>{dateOfCol.getDate()}/{dateOfCol.getMonth()+1}</span>
                   </div>
                 );
              })}
            </div>
          </div>
          {/* Week Grid */}
          <div className="flex relative w-full overflow-y-auto">
            <div className="w-12 flex-shrink-0 flex flex-col items-center pr-1 border-r border-border-color relative">
               {[...Array(24)].map((_, hour) => (
                 <div key={hour} className={`h-24 relative w-full text-center ${hour > 0 ? 'border-t border-border-color' : ''}`}>
                   <span className="font-mono text-[9px] font-bold text-outline-variant absolute -top-2 left-0 right-0 bg-bg-dark">{hour.toString().padStart(2, '0')}:00</span>
                 </div>
               ))}
            </div>
            <div className="flex-1 grid grid-cols-7 relative min-h-[2304px]">
               <div className="absolute w-full h-px bg-accent-red top-0 z-10 left-0" style={{top: `${(new Date().getHours() * 60 + new Date().getMinutes()) / 60 * 96}px`}}></div>
               {[...Array(7)].map((_, col) => {
                  const today = new Date(currentDate);
                  const currentDayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1;
                  const diff = col - currentDayOfWeek;
                  const dateOfCol = new Date(today);
                  dateOfCol.setDate(today.getDate() + diff);
                  const isMatch = (t: number) => {
                    const d = new Date(t);
                    return d.getDate() === dateOfCol.getDate() && d.getMonth() === dateOfCol.getMonth() && d.getFullYear() === dateOfCol.getFullYear();
                  };
                  const isToday = new Date().getDate() === dateOfCol.getDate() && new Date().getMonth() === dateOfCol.getMonth() && new Date().getFullYear() === dateOfCol.getFullYear();
                  return (
                    <div key={col} className={`relative border-r border-border-color border-dashed ${isToday ? 'bg-primary/5' : ''}`}>
                      {[...tasks].filter(t => isMatch(t.startTime)).map((task: any) => {
                        const startDt = new Date(task.startTime);
                        const endDt = new Date(task.endTime);
                        
                        const topMinutes = startDt.getHours() * 60 + startDt.getMinutes();
                        const topPx = (topMinutes / 60) * 96; 
                        const durationMinutes = ((endDt.getHours() - startDt.getHours()) * 60) + (endDt.getMinutes() - startDt.getMinutes());
                        const heightPx = Math.max((durationMinutes / 60) * 96, 20);

                        return (
                          <div 
                            key={task.id} 
                            onClick={() => setSelectedTask(task)}
                            style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                            className={`absolute left-0 right-0 mx-0.5 p-[3px] rounded shadow-sm border-l-[3px] border-t border-r border-b cursor-pointer overflow-hidden transition-transform hover:z-10 hover:scale-[1.02] ${task.status === 'PINNED' ? 'bg-accent-green/10 border-l-accent-green text-accent-green' : task.status === 'DONE' ? 'bg-surface-dim opacity-60 border-l-border-color text-on-surface-variant' : 'bg-accent-blue/10 border-l-accent-blue text-accent-blue'}`}
                          >
                            <h3 className="font-sans text-[9px] font-bold leading-tight truncate">
                              {task.title}
                            </h3>
                          </div>
                        );
                      })}
                    </div>
                  );
               })}
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="p-4 grid grid-cols-7 gap-1">
           {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="text-center font-mono text-sm text-on-surface-variant font-bold pb-2">{day}</div>
          ))}
          {[...Array(35)].map((_, i) => {
            const dateOfCol = new Date(currentDate);
            dateOfCol.setDate(1); // Set to 1st of month
            const firstDayOfWeek = dateOfCol.getDay() === 0 ? 6 : dateOfCol.getDay() - 1; // offset for Monday start
            dateOfCol.setDate(dateOfCol.getDate() - firstDayOfWeek + i); // Calculate actual date for cell
            
            const isToday = dateOfCol.getDate() === new Date().getDate() && dateOfCol.getMonth() === new Date().getMonth() && dateOfCol.getFullYear() === new Date().getFullYear();
            const isCurrentMonth = dateOfCol.getMonth() === new Date(currentDate).getMonth();
            
            const isMatch = (t: number) => {
               const d = new Date(t);
               return d.getDate() === dateOfCol.getDate() && d.getMonth() === dateOfCol.getMonth() && d.getFullYear() === dateOfCol.getFullYear();
            };
            const daysTasks = tasks.filter(t => isMatch(t.startTime)).sort((a, b) => a.startTime - b.startTime);

            return (
              <div key={i} className={`aspect-square border rounded p-1 cursor-pointer overflow-hidden flex flex-col transition-colors ${isCurrentMonth ? (isToday ? 'border-primary bg-primary/5' : 'border-border-color hover:bg-surface-bright bg-surface') : 'border-border-color/30 bg-surface-dim opacity-50'}`}>
                 <span className={`font-mono text-xs mb-1 ${isToday ? 'text-primary font-bold' : 'text-on-surface-variant'}`}>{dateOfCol.getDate()}</span>
                 {daysTasks.slice(0, 3).map((task: any) => (
                    <div 
                      key={task.id} 
                      onClick={(e) => { e.stopPropagation(); setSelectedTask(task) }}
                      className={`mb-[2px] rounded px-1 py-[2px] min-h-[16px] border text-[9px] font-sans truncate transition-transform hover:scale-[1.02] ${task.status === 'PINNED' ? 'bg-accent-green/10 border-accent-green/50 text-accent-green' : task.status === 'DONE' ? 'bg-surface-dim opacity-50 border-border-color/50 text-on-surface-variant' : 'bg-accent-blue/10 border-accent-blue/50 text-accent-blue'}`}
                    >
                      {task.title}
                    </div>
                 ))}
                 {daysTasks.length > 3 && (
                    <div className="text-[9px] text-outline-variant text-center mt-auto">+{daysTasks.length - 3}</div>
                 )}
              </div>
            );
          })}
        </div>
      );
    }
  }

  return (
    <div className="bg-bg-dark text-on-surface font-sans min-h-screen relative overflow-hidden flex flex-col md:flex-row w-full h-screen">
      {/* Notifications Toast */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-accent-blue border border-blue-400 text-bg-dark p-4 rounded-lg shadow-[0_4px_20px_rgba(59,130,246,0.3)] animate-bounce">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h4 className="font-mono font-bold tracking-tight text-sm mb-1">{notification.title}</h4>
              <p className="font-sans text-xs">{notification.message}</p>
            </div>
            <button onClick={() => setNotification(null)} className="text-bg-dark hover:text-white">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Desktop Left Sidebar: AI Chat Panel */}
      <aside 
        className={`${mobileTab === 'chat' ? 'flex flex-1 w-full' : 'hidden md:flex'} flex-col bg-surface-dim z-20 shrink-0 relative border-r border-border-color`}
        style={{ width: mobileTab === 'chat' ? undefined : `${sidebarWidth}px` }}
      >
        {mobileTab !== 'chat' && (
           <div 
             className="absolute top-0 -right-[2px] bottom-0 w-[5px] cursor-col-resize hover:bg-primary/30 z-[60] group transition-colors flex items-center justify-center"
             onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
           >
             <div className="h-10 w-1 bg-border-color group-hover:bg-primary rounded-full transition-colors flex flex-col justify-center gap-[2px] items-center">
                <div className="w-[2px] h-[2px] bg-surface-dim rounded-full"></div>
                <div className="w-[2px] h-[2px] bg-surface-dim rounded-full"></div>
                <div className="w-[2px] h-[2px] bg-surface-dim rounded-full"></div>
             </div>
           </div>
        )}
        <div className="p-4 border-b border-border-color flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">smart_toy</span>
            <h1 className="font-mono text-xl font-bold text-primary">Agent Assistance</h1>
          </div>
          {mobileTab === 'chat' && (
            <button onClick={() => setMobileTab('calendar')} className="md:hidden text-on-surface-variant">
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <div className="flex justify-center">
            <span className="font-mono text-[9px] font-semibold tracking-[0.15em] text-outline-variant bg-surface-bright px-2 py-1 rounded">SESSION INITIALIZED 08:42</span>
          </div>

          <div className="p-3 rounded-lg bg-surface border border-border-color w-[85%]">
            <p className="font-sans text-sm text-on-surface-variant">Tôi có thể giúp bạn lên lịch, phân tích thông báo, hoặc tối ưu hóa tự động.</p>
          </div>

          {chatMessages.map((msg: any, i) => (
             <div key={i} className={`p-3 rounded-lg border max-w-[85%] ${
               msg.role === 'user' 
                ? 'bg-accent-blue/10 border-accent-blue rounded-tr-none self-end text-on-surface' 
                : 'bg-surface border-border-color rounded-tl-none self-start text-on-surface-variant'
             }`}>
               {msg.role === 'user' ? (
                 <p className="font-sans text-sm whitespace-pre-wrap">{msg.content || ''}</p>
               ) : (
                 <div className="markdown-body">
                   <Markdown>{msg.content || '*Cooking...*'}</Markdown>
                 </div>
               )}
             </div>
          ))}
        </div>

        <div className="p-4 border-t border-border-color bg-surface-dim">
          <div className="flex gap-2 mb-3 overflow-x-auto hide-scrollbar whitespace-nowrap">
            <button onClick={() => handleSendMessage('Tạo lịch tuần này')} className="bg-surface-bright border border-border-color px-3 py-1.5 rounded-full font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-on-surface hover:border-primary transition-colors cursor-pointer">Tạo lịch tuần này</button>
            <button onClick={() => handleSendMessage('Kiểm tra xung đột')} className="bg-surface-bright border border-border-color px-3 py-1.5 rounded-full font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-on-surface hover:border-primary transition-colors cursor-pointer">Kiểm tra xung đột</button>
          </div>
          <div className="flex items-center gap-2 bg-surface-container border border-border-color rounded-lg p-1 focus-within:border-accent-blue transition-colors">
            <input 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
              className="flex-1 bg-transparent border-none outline-none text-on-surface font-sans text-sm placeholder:text-outline-variant px-2 h-10 w-full" 
              placeholder="Command or query..." 
              type="text"
            />
            <button onClick={() => handleSendMessage(inputValue)} className="w-8 h-8 flex items-center justify-center text-accent-blue hover:text-blue-400 transition-colors">
              <span className="material-symbols-outlined text-[20px]">send</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Center Area (Calendar) */}
      <div className={`${mobileTab === 'calendar' ? 'flex flex-1 w-full' : 'hidden md:flex flex-1'} flex-col relative h-full overflow-hidden`}>
        {/* Mobile App Bar */}
        <header className="md:hidden bg-surface-dim flex justify-between items-center w-full px-4 py-2 border-b border-outline-variant shrink-0 z-20 sticky top-0">
          <div className="font-mono text-2xl font-bold text-primary">
            Agent Assistance
          </div>
          <div className="flex items-center gap-4">
            <div className="relative cursor-pointer hover:bg-surface-bright transition-colors duration-100 p-1 rounded">
              <span className="material-symbols-outlined text-primary">notifications</span>
              <span className="absolute top-1 right-1 w-2 h-2 bg-accent-red rounded-full border border-surface-dim"></span>
            </div>
            <button onClick={() => setShowAccountModal(true)} className="w-8 h-8 rounded-full border border-border-color bg-surface-bright flex items-center justify-center relative">
               {isGoogleLoggedIn ? (
                 <div className="w-full h-full rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue font-bold text-[10px] uppercase">Me</div>
               ) : (
                 <span className="material-symbols-outlined text-sm text-on-surface-variant">person</span>
               )}
               {(!isGoogleLoggedIn || !integrations.email) && (
                 <span className="absolute top-0 right-0 w-2 h-2 bg-accent-red rounded-full border-2 border-bg-dark"></span>
               )}
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto hide-scrollbar bg-bg-dark relative pb-20">
          <div className="px-4 py-4 sticky top-0 bg-bg-dark/90 backdrop-blur-sm z-10 border-b border-border-color">
            <div className="flex justify-between items-end">
               <div>
                  <h2 className="font-mono text-2xl text-on-surface tracking-tight">
                    {calendarView === 'day' ? `Ngày ${currentDate.getDate()} Tháng ${currentDate.getMonth() + 1}, ${currentDate.getFullYear()}` : 
                     calendarView === 'week' ? `Tuần của Ngày ${currentDate.getDate()} Tháng ${currentDate.getMonth() + 1}, ${currentDate.getFullYear()}` : 
                     `Tháng ${currentDate.getMonth() + 1}, ${currentDate.getFullYear()}`}
                  </h2>
                  <div className="flex gap-2 mt-2 items-center relative z-50">
                    <button onClick={handlePrevDate} className="w-6 h-6 flex items-center justify-center hover:bg-surface-bright rounded border border-border-color transition-colors text-on-surface-variant hover:text-on-surface cursor-pointer" title="Trước">
                      <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                    </button>
                    <button onClick={() => { const d = new Date(); d.setHours(0,0,0,0); setCurrentDate(d); }} className="px-2 py-1 rounded bg-accent-blue/10 border border-accent-blue font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-accent-blue transition-colors hover:bg-accent-blue/20 cursor-pointer">Hôm nay</button>
                    <button onClick={handleNextDate} className="w-6 h-6 flex items-center justify-center hover:bg-surface-bright rounded border border-border-color transition-colors text-on-surface-variant hover:text-on-surface cursor-pointer" title="Sau">
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                  </div>
               </div>
               <div className="flex items-center gap-4">
                 <div className="flex bg-surface-container rounded-lg p-1 border border-border-color">
                    <button onClick={() => setCalendarView('day')} className={`px-4 py-1.5 rounded-md font-sans text-xs font-semibold overflow-hidden transition-all duration-200 ${calendarView === 'day' ? 'bg-surface-bright text-primary border border-border-color shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>Ngày</button>
                    <button onClick={() => setCalendarView('week')} className={`px-4 py-1.5 rounded-md font-sans text-xs font-semibold overflow-hidden transition-all duration-200 ${calendarView === 'week' ? 'bg-surface-bright text-primary border border-border-color shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>Tuần</button>
                    <button onClick={() => setCalendarView('month')} className={`px-4 py-1.5 rounded-md font-sans text-xs font-semibold overflow-hidden transition-all duration-200 ${calendarView === 'month' ? 'bg-surface-bright text-primary border border-border-color shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}>Tháng</button>
                 </div>
                 <button 
                   onClick={() => setShowAccountModal(true)}
                   className="hidden md:flex w-9 h-9 rounded-full border border-border-color bg-surface-bright items-center justify-center hover:border-primary transition-colors hover:shadow-[0_0_10px_rgba(168,199,250,0.1)] relative"
                 >
                   {isGoogleLoggedIn ? (
                     <div className="w-full h-full rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue font-bold text-xs uppercase">Me</div>
                   ) : (
                     <span className="material-symbols-outlined text-[18px] text-on-surface-variant">person</span>
                   )}
                   {(!isGoogleLoggedIn || !integrations.email) && (
                     <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-accent-red rounded-full border-2 border-bg-dark"></span>
                   )}
                 </button>
               </div>
            </div>
          </div>

          {/* Render Calendar specific to view */}
          {renderCalendarContent()}

        </main>

        {/* FAB Create New Task */}
        <button onClick={() => setShowTaskForm(true)} className="absolute bottom-24 right-4 w-12 h-12 bg-accent-blue text-bg-dark rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:bg-blue-400 transition-colors z-30">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
        </button>

        {/* Bottom Navigation */}
        <nav className="md:hidden bg-surface-dim border-t border-border-color flex justify-around items-center w-full px-4 py-2 z-40 shrink-0 pb-safe">
          <button onClick={() => setMobileTab('calendar')} className="flex flex-col items-center gap-1 w-1/4 group">
            <span className={`material-symbols-outlined ${mobileTab === 'calendar' ? 'text-accent-blue' : 'text-outline-variant'}`} style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
            <span className={`font-mono text-[11px] font-semibold tracking-[0.1em] ${mobileTab === 'calendar' ? 'text-accent-blue' : 'text-on-surface-variant'}`}>Lịch</span>
          </button>
          <button onClick={() => setMobileTab('chat')} className="flex flex-col items-center gap-1 w-1/4 group relative">
            <span className={`material-symbols-outlined ${mobileTab === 'chat' ? 'text-accent-blue' : 'text-outline-variant group-hover:text-primary transition-colors'}`}>smart_toy</span>
            <span className={`font-mono text-[11px] font-semibold tracking-[0.1em] ${mobileTab === 'chat' ? 'text-accent-blue' : 'text-on-surface-variant group-hover:text-primary transition-colors'}`}>Chat AI</span>
          </button>
          <button onClick={() => setMobileTab('notifications')} className="flex flex-col items-center gap-1 w-1/4 group relative">
            <span className={`material-symbols-outlined ${mobileTab === 'notifications' ? 'text-accent-blue' : 'text-outline-variant group-hover:text-primary transition-colors'}`}>inbox</span>
            {appNotifications.length > 0 && <span className="absolute top-0 right-1/4 w-2 h-2 bg-accent-red rounded-full border border-surface-dim"></span>}
            <span className={`font-mono text-[11px] font-semibold tracking-[0.1em] ${mobileTab === 'notifications' ? 'text-accent-blue' : 'text-on-surface-variant group-hover:text-primary transition-colors'}`}>Thông báo</span>
          </button>
          <button onClick={() => setShowAccountModal(true)} className="flex flex-col items-center gap-1 w-1/4 group">
            <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors">person</span>
            <span className="font-mono text-[11px] font-semibold tracking-[0.1em] text-on-surface-variant group-hover:text-primary transition-colors">Hồ sơ</span>
          </button>
        </nav>

      </div>

      {/* Task Modal (Confirm/Start) */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface-dim border border-border-color rounded-xl w-full max-w-sm p-5 shadow-2xl flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-mono text-xl font-bold text-on-surface uppercase tracking-tight">{selectedTask.title}</h3>
              <button onClick={() => setSelectedTask(null)} className="text-on-surface-variant hover:text-on-surface">
                 <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <p className="text-on-surface-variant text-sm font-sans mb-4">{selectedTask.description || "Không có mô tả"}</p>
            
            <div className="grid grid-cols-2 gap-2 mb-6 text-sm">
               <div className="bg-surface rounded p-2 border border-border-color">
                 <span className="block text-[10px] text-on-surface-variant uppercase font-mono tracking-widest mb-1">Bắt đầu</span>
                 <span className="font-mono text-on-surface">{new Date(selectedTask.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
               </div>
               <div className="bg-surface rounded p-2 border border-border-color">
                 <span className="block text-[10px] text-on-surface-variant uppercase font-mono tracking-widest mb-1">Kết thúc</span>
                 <span className="font-mono text-on-surface">{new Date(selectedTask.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
               </div>
            </div>

            {selectedTask.status === "DRAFT" ? (
              <div className="flex gap-3">
                <button 
                  onClick={() => updateTaskStatus(selectedTask.id, "PINNED")}
                  className="flex-1 bg-accent-blue hover:bg-blue-400 text-bg-dark font-mono uppercase text-sm font-bold tracking-widest py-2 rounded transition-colors"
                >Confirm</button>
                <button 
                   onClick={() => {
                     deleteTask(selectedTask.id);
                     handleSendMessage("Task '" + selectedTask.title + "' bị từ chối do xung đột hoặc không hợp lý. Hãy đề xuất (remake) khung giờ khác.");
                   }}
                   className="px-4 border border-accent-red hover:bg-accent-red/10 text-accent-red font-mono uppercase text-sm font-bold tracking-widest rounded transition-colors"
                >Remake</button>
              </div>
            ) : selectedTask.status === "PINNED" ? (
              <div className="flex flex-col gap-3">
                {activeCountdown?.id === selectedTask.id ? (
                   <>
                     <button 
                      onClick={() => { setActiveCountdown(null); updateTaskStatus(selectedTask.id, "DONE") }}
                      className="w-full border-2 border-accent-green text-accent-green hover:bg-accent-green/10 font-mono text-sm font-bold tracking-widest py-3 rounded transition-all flex items-center justify-center gap-2"
                     >
                       <span className="material-symbols-outlined text-[18px]">check_circle</span>
                       Hoàn thành
                     </button>
                     <div className="flex gap-2">
                       <button 
                        onClick={() => setActiveCountdown(null)}
                        className="flex-1 border border-on-surface-variant text-on-surface-variant hover:bg-surface-bright font-mono uppercase text-sm font-bold tracking-widest py-2 rounded transition-colors"
                       >
                         Dừng (Stop)
                       </button>
                       <button 
                        onClick={() => deleteTask(selectedTask.id)}
                        className="flex-1 border border-accent-red text-accent-red hover:bg-accent-red/10 font-mono uppercase text-sm font-bold tracking-widest py-2 rounded transition-colors"
                       >
                         Xóa Task
                       </button>
                     </div>
                   </>
                ) : (
                  <>
                    <button 
                      onClick={() => { 
                        const durationSecs = Math.floor((selectedTask.endTime - selectedTask.startTime) / 1000);
                        setActiveCountdown({ id: selectedTask.id, remainingSeconds: durationSecs > 0 ? durationSecs : 3600 });
                        setSelectedTask(null);
                      }}
                      className="w-full bg-primary hover:bg-green-400 text-bg-dark font-mono uppercase text-sm font-bold tracking-widest py-3 rounded transition-colors"
                    >Bắt đầu Task</button>
                    <button 
                      onClick={() => deleteTask(selectedTask.id)}
                      className="w-full border border-accent-red text-accent-red hover:bg-accent-red/10 font-mono uppercase text-sm font-bold tracking-widest py-2 rounded transition-colors"
                    >Xóa Task</button>
                  </>
                )}
              </div>
            ) : selectedTask.status === "DONE" ? (
              <div className="flex flex-col gap-3">
                 <button 
                      onClick={() => deleteTask(selectedTask.id)}
                      className="w-full border border-accent-red text-accent-red hover:bg-accent-red/10 font-mono uppercase text-sm font-bold tracking-widest py-2 rounded transition-colors"
                 >Xóa Task</button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface-dim border border-border-color rounded-xl w-full max-w-sm p-5 shadow-2xl flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-mono text-xl font-bold text-on-surface uppercase tracking-tight">Tạo Task Thủ Công</h3>
              <button onClick={() => setShowTaskForm(false)} className="text-on-surface-variant hover:text-on-surface">
                 <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="flex flex-col gap-3 mb-6">
              <div>
                <label className="block font-mono text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Tên công việc</label>
                <input 
                  type="text" 
                  value={newTask.title}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  className="w-full bg-surface border border-border-color rounded p-2 text-sm text-on-surface focus:border-accent-blue outline-none transition-colors"
                />
              </div>
              <div>
                 <label className="block font-mono text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Mô tả chi tiết</label>
                 <textarea 
                  value={newTask.description}
                  onChange={e => setNewTask({...newTask, description: e.target.value})}
                  className="w-full bg-surface border border-border-color rounded p-2 text-sm text-on-surface focus:border-accent-blue outline-none transition-colors h-20 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                 <div>
                    <label className="block font-mono text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Bắt đầu</label>
                    <input 
                      type="datetime-local" 
                      value={newTask.startTime}
                      onChange={e => setNewTask({...newTask, startTime: e.target.value})}
                      className="w-full bg-surface border border-border-color rounded p-2 text-sm text-on-surface focus:border-accent-blue outline-none transition-colors [color-scheme:dark]"
                    />
                 </div>
                 <div>
                    <label className="block font-mono text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Kết thúc</label>
                    <input 
                      type="datetime-local" 
                      value={newTask.endTime}
                      onChange={e => setNewTask({...newTask, endTime: e.target.value})}
                      className="w-full bg-surface border border-border-color rounded p-2 text-sm text-on-surface focus:border-accent-blue outline-none transition-colors [color-scheme:dark]"
                    />
                 </div>
              </div>
              {errorMsg && <p className="text-accent-red text-xs mt-2">{errorMsg}</p>}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={handleCreateTask}
                className="flex-1 bg-accent-blue hover:bg-blue-400 text-bg-dark font-mono uppercase text-sm font-bold tracking-widest py-2 rounded transition-colors"
              >Thêm Task</button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Right Sidebar: Notification Hub */}
      <aside 
        className={`${mobileTab === 'notifications' ? 'flex flex-1 w-full' : 'hidden md:flex'} flex-col bg-surface-dim z-20 shrink-0 relative border-l border-border-color`}
        style={{ width: mobileTab === 'notifications' ? undefined : `${hubWidth}px` }}
      >
        {mobileTab !== 'notifications' && (
           <div 
             className="absolute top-0 -left-[2px] bottom-0 w-[5px] cursor-col-resize hover:bg-primary/30 z-[60] group transition-colors flex items-center justify-center"
             onMouseDown={(e) => { e.preventDefault(); setIsResizingHub(true); }}
           >
             <div className="h-10 w-1 bg-border-color group-hover:bg-primary rounded-full transition-colors flex flex-col justify-center gap-[2px] items-center">
                <div className="w-[2px] h-[2px] bg-surface-dim rounded-full"></div>
                <div className="w-[2px] h-[2px] bg-surface-dim rounded-full"></div>
                <div className="w-[2px] h-[2px] bg-surface-dim rounded-full"></div>
             </div>
           </div>
        )}
        <div className="p-4 border-b border-border-color flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-on-surface">inbox</span>
            <h2 className="font-mono text-sm font-bold text-on-surface uppercase pr-2 tracking-widest">Hub</h2>
            <span className="bg-error/20 text-error font-mono text-[9px] px-1.5 py-0.5 rounded">{appNotifications.length}</span>
          </div>
          {mobileTab === 'notifications' && (
            <button onClick={() => setMobileTab('calendar')} className="md:hidden text-on-surface-variant">
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>
        <div className="p-4 overflow-y-auto flex flex-col gap-4 flex-1">
          {appNotifications.map((notif) => (
            <div key={notif.id} className="bg-surface border border-border-color rounded p-3">
              <div className="flex justify-between items-center mb-2">
                <span className="font-mono text-[9px] uppercase text-on-surface tracking-[0.1em] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">{notif.type}</span> {notif.source}
                </span>
                <span className="font-mono text-[9px] text-on-surface-variant uppercase">{notif.time}</span>
              </div>
              <h4 className="font-mono text-sm font-semibold text-on-surface mb-1">{notif.title}</h4>
              <p className="font-sans text-xs text-on-surface-variant mb-2">{notif.snippet}</p>
              <div className="flex gap-2">
                 <button onClick={() => handleSendMessage(`Hãy tóm tắt email này giúp tôi: Tiêu đề: "${notif.title}", Nội dung: "${notif.snippet}"`)} className="border border-border-color font-mono text-[9px] uppercase px-2 py-1 rounded text-on-surface hover:bg-surface-bright transition-colors flex items-center gap-1"><span className="material-symbols-outlined text-[12px] text-accent-blue">auto_awesome</span>Tóm tắt</button>
                 <button onClick={() => handleGenerateSuggestedReply(notif)} className="bg-accent-blue text-bg-dark font-mono text-[9px] uppercase font-bold px-3 py-1 rounded hover:bg-blue-400 transition-colors">Reply</button>
              </div>
            </div>
          ))}
        </div>
      </aside>
      {selectedNotificationForReply && (
        <div className="fixed inset-0 bg-bg-dark/90 z-[100] flex items-center justify-center p-2 sm:p-6 backdrop-blur-sm">
           <div className="bg-surface border border-border-color rounded-2xl w-full max-w-5xl h-[95vh] md:h-[85vh] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-300">
              
              {/* Left Side: Original Email Info */}
              <div className="shrink-0 bg-surface-dim/30 border-b md:border-r border-border-color p-4 md:p-8 flex flex-col overflow-y-auto w-full md:w-[35%] max-h-[35vh] md:max-h-none">
                 <div className="flex items-center gap-3 mb-4 md:mb-6">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-accent-blue/10 flex items-center justify-center border border-accent-blue/20">
                      <span className="material-symbols-outlined text-accent-blue text-lg md:text-xl">mark_email_unread</span>
                    </div>
                    <div>
                      <h3 className="font-mono text-[10px] md:text-xs tracking-widest text-on-surface-variant font-semibold uppercase">{selectedNotificationForReply.source}</h3>
                      <span className="text-xs md:text-sm text-on-surface font-medium">Message Thread</span>
                    </div>
                 </div>
                 
                 <div className="flex flex-col flex-1">
                   <h4 className="font-sans font-bold text-on-surface text-lg md:text-xl leading-tight mb-3 md:mb-4">{selectedNotificationForReply.title}</h4>
                   
                   <div className="flex items-center gap-2 mb-3 md:mb-4 text-xs md:text-sm text-on-surface-variant">
                     <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-surface border border-border-color flex items-center justify-center">
                        <span className="material-symbols-outlined text-[12px] md:text-sm">person</span>
                     </div>
                     <div className="flex flex-col leading-tight">
                        <span className="font-semibold text-on-surface">Sender</span>
                        <span className="text-[10px] md:text-[11px] opacity-80">Just now</span>
                     </div>
                   </div>

                   <div className="bg-surface relative rounded-xl border border-border-color p-4 md:p-5 flex-1 shadow-sm overflow-y-auto">
                      <div className="absolute top-4 left-0 w-1 h-8 bg-border-color rounded-r-md"></div>
                      <p className="font-sans text-[13px] md:text-[15px] leading-relaxed text-on-surface-variant whitespace-pre-wrap">{selectedNotificationForReply.snippet}</p>
                   </div>
                 </div>
              </div>

              {/* Right Side: AI Reply Generator */}
              <div className="flex-1 flex flex-col p-4 md:p-8 bg-surface w-full md:w-[65%] relative">
                 <button onClick={() => setSelectedNotificationForReply(null)} className="absolute top-4 right-4 md:top-6 md:right-6 w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-bright text-on-surface-variant hover:text-on-surface transition-colors">
                    <span className="material-symbols-outlined text-[20px]">close</span>
                 </button>

                 <div className="flex items-center gap-2 mb-4 md:mb-6">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-[14px] md:text-[18px]">auto_awesome</span>
                    </div>
                    <div>
                      <h3 className="font-sans text-base md:text-lg font-bold text-on-surface">AI Smart Reply</h3>
                      <p className="text-[10px] md:text-xs text-on-surface-variant font-mono uppercase tracking-wider">Draft Assistant</p>
                    </div>
                 </div>

                 <div className="flex flex-col flex-1 relative group bg-surface border border-border-color rounded-xl shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50 transition-all overflow-hidden min-h-[200px]">
                    <textarea 
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      className="w-full h-full bg-transparent p-4 md:p-5 pb-[60px] md:pb-[70px] text-[13px] md:text-[15px] leading-relaxed text-on-surface outline-none resize-none disabled:opacity-40"
                      disabled={isGeneratingReply}
                      placeholder={isGeneratingReply ? "Đang soạn thảo..." : "Soạn phản hồi của bạn..."}
                    />
                    
                    {isGeneratingReply && (
                       <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-dim/70 backdrop-blur-sm z-10 p-4 text-center">
                          <span className="material-symbols-outlined text-primary animate-spin text-3xl md:text-4xl mb-2 md:mb-3">sync</span>
                          <span className="font-mono text-[10px] md:text-xs text-primary font-bold uppercase tracking-widest animate-pulse">Generating Response...</span>
                       </div>
                    )}

                    {/* Toolbar / Actions inside composer */}
                    <div className="absolute bottom-0 left-0 right-0 px-2 md:px-4 py-2 md:py-3 flex justify-end items-center z-10 pointer-events-none bg-surface/80 backdrop-blur-sm">
                       <div className="flex items-center gap-2 pointer-events-auto">
                          <button 
                            onClick={() => handleGenerateSuggestedReply(selectedNotificationForReply)}
                            disabled={isGeneratingReply}
                            className="bg-surface hover:bg-surface-bright text-on-surface-variant hover:text-primary border border-border-color font-sans font-medium text-[11px] md:text-xs px-2.5 md:px-3 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 group/btn disabled:opacity-50 shadow-sm whitespace-nowrap"
                            title="Xóa và tạo lại nháp"
                          >
                            <span className="material-symbols-outlined text-[13px] md:text-[15px] group-hover/btn:-rotate-180 transition-transform duration-500">refresh</span>
                            Soạn lại
                          </button>
                          <button 
                            onClick={handleSendReply}
                            disabled={isGeneratingReply || !replyDraft}
                            className="bg-primary/90 hover:bg-primary text-bg-dark font-sans font-bold text-[11px] md:text-xs px-3 md:px-4 py-1.5 rounded-lg shadow-[0_0_15px_rgba(34,197,94,0.2)] hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all flex items-center justify-center gap-1 mt-0 group/send disabled:opacity-50 disabled:shadow-none relative"
                          >
                            <span className="material-symbols-outlined text-[14px] md:text-[16px] group-hover/send:translate-x-0.5 group-hover/send:-translate-y-0.5 transition-transform">send</span>
                            Gửi đi
                          </button>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-bg-dark/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-surface border border-border-color rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-start mb-6">
                 <div>
                    <h2 className="font-sans text-xl font-bold text-on-surface">Tài khoản & Kết nối</h2>
                    <p className="text-sm text-on-surface-variant mt-1">Quản lý phiên đăng nhập và các ứng dụng bên thứ 3.</p>
                 </div>
                 <button onClick={() => setShowAccountModal(false)} className="w-8 h-8 rounded-full hover:bg-surface-bright flex items-center justify-center text-on-surface-variant transition-colors">
                    <span className="material-symbols-outlined text-[20px]">close</span>
                 </button>
              </div>

              <div className="space-y-6">
                 {/* Google Login Section */}
                 <div className="bg-surface-dim p-4 rounded-xl border border-border-color">
                    <div className="flex justify-between items-center">
                       <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                             <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                             </svg>
                          </div>
                          <div>
                             <h3 className="font-sans font-bold text-on-surface">Tài khoản Google</h3>
                             <p className="text-xs text-on-surface-variant">{isGoogleLoggedIn ? "Đã đăng nhập" : "Yêu cầu đăng nhập"}</p>
                          </div>
                       </div>
                       <button 
                         onClick={handleGoogleLogin}
                         className={`px-4 py-2 rounded-lg font-sans text-sm font-semibold transition-colors ${
                           isGoogleLoggedIn 
                             ? 'border border-border-color text-on-surface hover:bg-error/10 hover:text-error hover:border-error/50' 
                             : 'bg-primary text-bg-dark hover:bg-primary/90'
                         }`}
                       >
                         {isGoogleLoggedIn ? 'Đăng xuất' : 'Đăng nhập'}
                       </button>
                    </div>
                 </div>

                 {/* Appearance Section */}
                 <div>
                    <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4 flex items-center gap-2">
                       <span className="material-symbols-outlined text-[14px]">palette</span>
                       Giao diện
                    </h3>
                    <div className="flex justify-between items-center bg-surface-dim/50 p-3 rounded-lg border border-border-color">
                       <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme === 'dark' ? 'bg-surface-bright text-on-surface' : 'bg-primary/20 text-primary'}`}>
                             <span className="material-symbols-outlined text-[18px]">{theme === 'dark' ? 'dark_mode' : 'light_mode'}</span>
                          </div>
                          <span className="font-sans text-sm font-medium text-on-surface">Chế độ Sáng</span>
                       </div>
                       <div 
                         className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${theme === 'light' ? 'bg-primary' : 'bg-surface-bright border border-border-color'}`} 
                         onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                       >
                          <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${theme === 'light' ? 'translate-x-5' : ''}`}></div>
                       </div>
                    </div>
                 </div>

                 {/* Integrations Section */}
                 <div>
                    <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4 flex items-center gap-2">
                       <span className="material-symbols-outlined text-[14px]">link</span>
                       Ứng dụng đã kết nối
                    </h3>
                    <div className="space-y-3">
                       <div className="flex justify-between items-center bg-surface-dim/50 p-3 rounded-lg border border-border-color">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-[#EA4335]/10 text-[#EA4335] flex items-center justify-center">
                                <span className="material-symbols-outlined text-[18px]">mail</span>
                             </div>
                             <span className="font-sans text-sm font-medium text-on-surface">Gmail Workspace</span>
                          </div>
                          <div className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${integrations.email ? 'bg-primary' : 'bg-surface-bright border border-border-color'}`} onClick={() => setIntegrations(prev => ({...prev, email: !prev.email}))}>
                             <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${integrations.email ? 'translate-x-5' : ''}`}></div>
                          </div>
                       </div>
                       <div className="flex justify-between items-center bg-surface-dim/50 p-3 rounded-lg border border-border-color">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-[#00A4EF]/10 text-[#00A4EF] flex items-center justify-center">
                                <span className="material-symbols-outlined text-[18px]">mark_email_unread</span>
                             </div>
                             <span className="font-sans text-sm font-medium text-on-surface">Microsoft Outlook</span>
                          </div>
                          <div className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${integrations.outlook ? 'bg-primary' : 'bg-surface-bright border border-border-color'}`} onClick={handleOutlookConnect}>
                             <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${integrations.outlook ? 'translate-x-5' : ''}`}></div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}
