import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LineChart, Line } from "recharts";
import { motion } from "framer-motion";
import { Upload, RefreshCw, Download } from "lucide-react";

// ---------- Utility ----------
const fmtNum = (n) => new Intl.NumberFormat().format(Math.round(n || 0));
const percent = (num, den) => den ? Math.round((num / den) * 100) : 0;

const slotsOrder = [
  "Morning (6–12)",
  "Afternoon (12–18)",
  "Evening (18–24)",
  "Night (0–6)",
];

// ---------- Upload Helper ----------
function useStatsState() {
  const [stats, setStats] = useState(null);
  const [fileName, setFileName] = useState("");
  const onUpload = async (file) => {
    const text = await file.text();
    const json = JSON.parse(text);
    setStats(json);
    setFileName(file.name);
  };
  return { stats, setStats, fileName, onUpload };
}

// ---------- Reusable UI ----------
const MetricCard = ({ label, value, sub }) => (
  <Card className="rounded-2xl shadow-sm border p-4">
    <CardContent className="p-0">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-3xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </CardContent>
  </Card>
);

const Section = ({ title, children, right }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-semibold">{title}</h2>
      {right}
    </div>
    <div className="grid gap-4">{children}</div>
  </div>
);

// ---------- Charts ----------
const PieByPillar = ({ data, total }) => (
  <div className="h-64">
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="pillar" cx="50%" cy="50%" outerRadius={90} label={(e)=>`${e.pillar} (${percent(e.count,total)}%)`}>
          {data.map((_, i) => <Cell key={i} />)}
        </Pie>
        <RTooltip/>
      </PieChart>
    </ResponsiveContainer>
  </div>
);

const BarBySender = ({ data }) => (
  <div className="h-64">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="sender" hide/>
        <YAxis />
        <TooltipWrapper/>
        <Legend />
        <Bar dataKey="count" name="Messages">
          {data.map((_, i) => <Cell key={i} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
);

const LinePillarTrend = ({ data }) => {
  const rows = useMemo(() => {
    const index = {};
    data.forEach(({ week, pillar, count }) => {
      if(!index[week]) index[week] = { week };
      index[week][pillar] = (index[week][pillar] || 0) + count;
    });
    return Object.values(index).sort((a,b)=>a.week.localeCompare(b.week));
  }, [data]);
  const keys = useMemo(() => Array.from(new Set(data.map(d=>d.pillar))), [data]);
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week"/>
          <YAxis/>
          <TooltipWrapper/>
          <Legend/>
          {keys.map((k,i)=> <Line type="monotone" dataKey={k} key={k} dot={false} />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const Heatmap = ({ data }) => {
  const dates = Array.from(new Set(data.map(d=>d.date_only))).sort();
  const lookup = new Map(data.map(d=>[`${d.date_only}|${d.slot}`, d.count]));
  const max = Math.max(1, ...data.map(d=>d.count));
  return (
    <div className="overflow-auto">
      <div className="grid" style={{gridTemplateColumns: `120px repeat(${dates.length}, 1fr)`}}>
        <div className="text-xs text-gray-500 p-2">Slot \ Date</div>
        {dates.map(dt=> <div key={dt} className="text-[10px] text-gray-500 p-2 text-center">{dt}</div>)}
        {slotsOrder.map(slot => (
          <React.Fragment key={slot}>
            <div className="text-xs font-medium p-2 sticky left-0 bg-white z-10">{slot}</div>
            {dates.map(dt => {
              const c = lookup.get(`${dt}|${slot}`) || 0;
              const alpha = c / max;
              return <div key={`${dt}|${slot}`} className="p-2 text-center" style={{background: `rgba(0,0,0,${alpha*0.12})`}}>
                <span className="text-xs">{c}</span>
              </div>
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const TooltipWrapper = (props) => <RTooltip {...props} />

// ---------- Main ----------
export default function StatsDashboard() {
  const { stats, onUpload, fileName } = useStatsState();

  const total = stats?.summary?.total_messages || 0;
  const byPillar = stats?.by_pillar || [];
  const bySender = stats?.by_sender || [];

  const topSenders = useMemo(() => [...bySender].sort((a,b)=>b.count-a.count).slice(0,10), [bySender]);

  return (
    <div className="min-h-screen p-6 md:p-10 bg-neutral-50">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold">Chat Portal — Stats Dashboard</h1>
            <p className="text-gray-500 mt-1">Upload the <code>chat_portal_stats.json</code> to visualize analytics.</p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="file" className="inline-flex">
              <input id="file" type="file" accept="application/json" className="hidden" onChange={(e)=>e.target.files?.[0] && onUpload(e.target.files[0])} />
              <Button variant="default" className="rounded-2xl"><Upload className="w-4 h-4 mr-2"/>Upload JSON</Button>
            </label>
            {stats && <Button variant="secondary" className="rounded-2xl" onClick={()=>navigator.clipboard.writeText(JSON.stringify(stats))}><Download className="w-4 h-4 mr-2"/>Copy JSON</Button>}
          </div>
        </div>

        {/* Summary cards */}
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Total Messages" value={fmtNum(total)} sub={fileName && `from ${fileName}`} />
          <MetricCard label="Unique Senders" value={fmtNum(stats?.summary?.unique_senders || 0)} />
          <MetricCard label="First Message" value={stats?.summary?.first_message_at ? new Date(stats.summary.first_message_at).toLocaleString() : "—"} />
          <MetricCard label="Last Message" value={stats?.summary?.last_message_at ? new Date(stats.summary.last_message_at).toLocaleString() : "—"} />
        </motion.div>

        {/* Pillars */}
        <Section title="Messages by Pillar">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="rounded-2xl p-4">
              <PieByPillar data={byPillar} total={total} />
            </Card>
            <Card className="rounded-2xl p-4 col-span-2">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byPillar}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="pillar"/>
                    <YAxis/>
                    <TooltipWrapper/>
                    <Bar dataKey="count" name="Messages">
                      {byPillar.map((_, i) => <Cell key={i} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </Section>

        {/* Senders */}
        <Section title="Messages by Sender" right={<div className="text-xs text-gray-500">Top 10 senders</div>}>
          <Card className="rounded-2xl p-4">
            <BarBySender data={topSenders} />
          </Card>
        </Section>

        {/* Time of Day */}
        <Section title="Time-of-Day Activity Heatmap" right={<div className="text-xs text-gray-500">Slots: Morning, Afternoon, Evening, Night</div>}>
          <Card className="rounded-2xl p-4">
            <Heatmap data={stats?.heatmap_date_slot || []} />
          </Card>
        </Section>

        {/* Pillar Trend */}
        <Section title="Pillar Trends — Weekly">
          <Card className="rounded-2xl p-4">
            <LinePillarTrend data={stats?.pillar_trend_week || []} />
          </Card>
        </Section>

        {/* Response Time */}
        <Section title="Avg Response Time by Sender (mins)">
          <Card className="rounded-2xl p-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.avg_response_time_by_sender || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sender" hide/>
                  <YAxis/>
                  <TooltipWrapper/>
                  <Legend/>
                  <Bar dataKey="avg_response_mins" name="Avg mins" >
                    {(stats?.avg_response_time_by_sender || []).map((_, i) => <Cell key={i} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Section>

      </div>
    </div>
  );
}
