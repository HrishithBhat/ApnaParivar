import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ReactFlow, Background, Controls, MiniMap, ReactFlowProvider, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import AppLayout from '../components/layout/AppLayout';
import Button from '../components/ui/Button';
import { apiUrl } from '../lib/api';

export default function FamilyTree() {
  const [members, setMembers] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [familyId, setFamilyId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
  const me = await fetch(apiUrl('/api/auth/me'), { credentials: 'include' });
        if (!me.ok) { navigate('/'); return; }
        const meData = await me.json();
  const famIdRaw = meData.user?.primaryFamily?.familyId;
        const famId = typeof famIdRaw === 'string' ? famIdRaw : (famIdRaw?._id || famIdRaw?.$oid || String(famIdRaw));
  if (!famId) { navigate('/dashboard'); return; }
  setFamilyId(famId);
  const membersRes = await fetch(apiUrl(`/api/families/${encodeURIComponent(famId)}/members`), { credentials: 'include' });
        if (!membersRes.ok) {
          let txt = 'Failed to load members';
          try {
            const err = await membersRes.json();
            txt = err.message || err.error || txt;
          } catch {}
          throw new Error(txt);
        }
        const data = await membersRes.json();
        const list = data.members || [];
        setMembers(list);
      } catch (e) {
        console.error('Load members error:', e);
        setError(e.message || 'Failed to load members');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate, refreshKey]);

  // Listen for cross-page family change events to refresh the tree automatically
  useEffect(() => {
    const onChange = () => setRefreshKey(k => k + 1);
    window.addEventListener('apna:familyChanged', onChange);
    return () => window.removeEventListener('apna:familyChanged', onChange);
  }, []);

  // Build maps
  const byId = useMemo(() => {
    const map = new Map();
    members.forEach(m => map.set(String(m._id), m));
    return map;
  }, [members]);

  const childrenMap = useMemo(() => {
    const map = new Map();
    members.forEach(m => {
      const mid = String(m._id);
      const children = (m.relationships?.children || []).map(c => String(typeof c === 'string' ? c : c?.memberId || c));
      children.forEach(cid => {
        const arr = map.get(mid) || [];
        if (!arr.includes(cid)) arr.push(cid);
        map.set(mid, arr);
      });
    });
    return map;
  }, [members]);

  // Build spouse pairs (unique undirected edges between partners)
  const spousePairs = useMemo(() => {
    const set = new Set();
    const pairs = [];
    members.forEach(m => {
      const mId = String(m._id);
      const spouses = Array.isArray(m.relationships?.spouse) ? m.relationships.spouse : [];
      spouses.forEach(s => {
        const sid = s?.memberId ? String(s.memberId) : null;
        if (!sid) return;
        // canonical key to avoid duplicates
        const a = mId < sid ? mId : sid;
        const b = mId < sid ? sid : mId;
        const key = `${a}|${b}`;
        if (!set.has(key)) {
          set.add(key);
          pairs.push([a, b]);
        }
      });
    });
    return pairs;
  }, [members]);

  const parentsSet = useMemo(() => {
    const set = new Set();
    members.forEach(m => {
      const father = m.relationships?.father;
      const mother = m.relationships?.mother;
      [father, mother].forEach(p => {
        const id = p ? String(typeof p === 'string' ? p : p?.memberId || p) : null;
        if (id) set.add(String(m._id));
      });
    });
    return set;
  }, [members]);

  // Roots = members without parents
  const roots = useMemo(() => {
    const rs = members.filter(m => !parentsSet.has(String(m._id)));
    if (rs.length > 0) return rs.map(m => String(m._id));
    return members.length ? [String(members[0]._id)] : [];
  }, [members, parentsSet]);

  // Simple tree layout (DFS): assign x based on leaf order, y by depth
  useEffect(() => {
    if (!members.length) { setNodes([]); setEdges([]); return; }

    const pos = new Map();
    const visited = new Set();
    let leafIndex = 0;
    const XGAP = 180; // px
    const YGAP = 140; // px

    const ensureChildren = (id) => childrenMap.get(id) || [];

    const assign = (id, depth) => {
      if (visited.has(id)) return;
      visited.add(id);
      const kids = ensureChildren(id);
      if (!kids.length) {
        pos.set(id, { x: leafIndex * XGAP, y: depth * YGAP });
        leafIndex += 1;
      } else {
        kids.forEach(k => assign(k, depth + 1));
        const xs = kids.map(k => pos.get(k)?.x || 0);
        const avg = xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
        pos.set(id, { x: avg, y: depth * YGAP });
      }
    };

    // handle multiple root trees side by side
    roots.forEach(r => assign(r, 0));

    // Normalize x to start at 0
    const minX = Math.min(...Array.from(pos.values()).map(p => p.x));
    const shiftX = isFinite(minX) ? -minX + 40 : 0;

    // Preserve any existing positions to avoid layout shifts after manual connections
    const existingPos = new Map(nodes.map(n => [n.id, n.position]));

    const nodesBuilt = members.map(m => {
      const id = String(m._id);
      const p = pos.get(id) || { x: 0, y: 0 };
      const name = [m.firstName, m.middleName, m.lastName].filter(Boolean).join(' ') || 'Unknown';
      const gender = (m.gender || '').toLowerCase();
      const bg = gender === 'male' ? '#eff6ff' : gender === 'female' ? '#fff1f2' : '#f3f4f6';
      const border = gender === 'male' ? '#bfdbfe' : gender === 'female' ? '#fecdd3' : '#e5e7eb';
      const stored = (m.position && Number.isFinite(m.position.x) && Number.isFinite(m.position.y))
        ? { x: m.position.x, y: m.position.y }
        : null;
      return {
        id,
        type: 'member',
        position: existingPos.get(id) || stored || { x: p.x + shiftX, y: p.y + 40 },
        data: { label: name, bg, border }
      };
    });

    const edgesBuilt = [];
    for (const [pid, kids] of childrenMap.entries()) {
      kids.forEach(cid => {
        edgesBuilt.push({ id: `${pid}->${cid}`, source: pid, target: String(cid), animated: false });
      });
    }

    // Add spouse edges (undirected coupling)
    spousePairs.forEach(([a, b]) => {
      // if nodes exist, add an edge between spouses
      if (pos.has(a) && pos.has(b)) {
        edgesBuilt.push({
          id: `${a}<->${b}`,
          source: a,
          target: b,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#f59e0b' }, // amber accent for spouse
          markerEnd: undefined
        });
      }
    });

    setNodes(nodesBuilt);
    setEdges(edgesBuilt);
  }, [members, childrenMap, roots, spousePairs]);

  // No focus/fit logic to keep component simple and stable
  // Custom node with connection handles to enable manual linking
  const MemberNode = ({ data }) => {
    return (
      <div style={{ padding: 8, borderRadius: 8, border: `1px solid ${data.border}`, background: data.bg, minWidth: 120, textAlign: 'center' }}>
        <Handle type="target" position={Position.Top} style={{ width: 8, height: 8 }} />
        <div style={{ fontWeight: 600, color: '#111827' }}>{data.label}</div>
        <Handle type="source" position={Position.Bottom} style={{ width: 8, height: 8 }} />
      </div>
    );
  };

  const nodeTypes = useMemo(() => ({ member: MemberNode }), []);

  const onConnect = async (connection) => {
    try {
      const { source, target } = connection || {};
      if (!source || !target || source === target) return;

      const choice = window.prompt('Create relationship: type one of: parent, child, spouse');
      if (!choice) return;
      const type = choice.trim().toLowerCase();
      if (!['parent', 'child', 'spouse'].includes(type)) {
        alert('Unsupported relationship type. Use parent, child, or spouse.');
        return;
      }

      const res = await fetch(apiUrl('/api/members/connect'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ familyId, sourceId: source, targetId: target, relation: type })
      });
      if (!res.ok) {
        let msg = 'Failed to create relationship';
        try { const err = await res.json(); msg = err.message || msg; } catch {}
        throw new Error(msg);
      }

      // Optimistically add the new edge without re-layout to keep positions
      if (type === 'spouse') {
        const a = source < target ? source : target;
        const b = source < target ? target : source;
        const id = `${a}<->${b}`;
        setEdges(prev => prev.find(e => e.id === id) ? prev : [
          ...prev,
          { id, source: a, target: b, type: 'smoothstep', style: { stroke: '#f59e0b' } }
        ]);
      } else {
        const parent = type === 'parent' ? source : target;
        const child = type === 'parent' ? target : source;
        const id = `${parent}->${child}`;
        setEdges(prev => prev.find(e => e.id === id) ? prev : [
          ...prev,
          { id, source: parent, target: child }
        ]);
      }
    } catch (e) {
      console.error('Create relationship error:', e);
      alert(e.message || 'Failed to create relationship');
    }
  };

  if (loading) {
    return (
      <AppLayout title="Family Tree">
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading family tree...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const TreeCanvas = (
    <AppLayout title="Family Tree">
      <div className="px-2 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="max-w-3xl mx-auto bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {(!error && members.length === 0) ? (
          <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-6 text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No members yet</h2>
            <p className="text-gray-600 mb-4">Add a member to start building your family tree.</p>
            <Button onClick={() => navigate('/add-member')}>Add Member</Button>
          </div>
        ) : (
          <div style={{ height: 'calc(100vh - 180px)' }} className="bg-white rounded-lg shadow overflow-hidden">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onConnect={onConnect}
              onNodeDragStop={async (_evt, node) => {
                try {
                  setNodes(prev => prev.map(n => n.id === node.id ? { ...n, position: node.position } : n));
                  await fetch(apiUrl(`/api/members/${encodeURIComponent(node.id)}/position`), {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ x: node.position.x, y: node.position.y })
                  });
                } catch (e) {
                  console.error('Save position error:', e);
                }
              }}
              fitView
            >
              <Background variant="dots" gap={16} size={1} />
              <Controls position="top-right" />
              <MiniMap pannable zoomable />
            </ReactFlow>
          </div>
        )}
      </div>
    </AppLayout>
  );

  return (
    <ReactFlowProvider>
      {TreeCanvas}
    </ReactFlowProvider>
  );
}
