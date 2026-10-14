"""Event quality, inactivity sessions and chronological conversion analysis."""
def parse_events(lines, required):
    """Parse nonblank JSON lines. Keep first valid unique event ID. Required values must exist; id/user/type
    are nonempty strings, type in view/cart/buy and at must parse as timezone-aware ISO datetime.
    Return (events, rejected); rejected rows retain 1-based line, raw text and reason invalid or duplicate.
    """
    import json
    from datetime import datetime
    events,rejected,seen=[],[],set()
    for index,line in enumerate(lines,1):
        if not line.strip():continue
        try:
            row=json.loads(line)
            if not isinstance(row,dict) or any(key not in row for key in required):raise ValueError('schema')
            if any(not isinstance(row[k],str) or not row[k] for k in ['id','user','type']) or row['type'] not in ['view','cart','buy']:raise ValueError('schema')
            at=datetime.fromisoformat(row['at'])
            if at.tzinfo is None:raise ValueError('timezone')
            reason='duplicate' if row['id'] in seen else None
            if reason:rejected.append({'line':index,'raw':line.rstrip('\n'),'reason':reason})
            else:events.append(dict(row));seen.add(row['id'])
        except (ValueError,TypeError,KeyError):rejected.append({'line':index,'raw':line.rstrip('\n'),'reason':'invalid'})
    return events,rejected

def sessionize(events, timeout_minutes=30):
    """Sort by user, parsed timestamp and event ID. Start a new session when gap is > timeout_minutes
    (exactly 30 stays together). Return [{id:'user:1',user,events:[...]}], with per-user numbering from 1.
    Do not mutate the inputs. Sort comparisons must respect timestamp offsets.
    """
    from datetime import datetime
    ordered=sorted(events,key=lambda r:(r['user'],datetime.fromisoformat(r['at']),r['id']))
    sessions=[];previous=None;number=0
    for row in ordered:
        at=datetime.fromisoformat(row['at'])
        if previous is None or row['user']!=previous['user']:
            number=1;new=True
        else:new=(at-datetime.fromisoformat(previous['at'])).total_seconds()>timeout_minutes*60
        if new:
            if previous is not None and row['user']==previous['user']:number+=1
            sessions.append({'id':f"{row['user']}:{number}",'user':row['user'],'events':[]})
        sessions[-1]['events'].append(dict(row));previous=row
    return sessions

def analyze(events, sessions):
    """Return summary and retention rows. Summary: events/users/sessions/viewed_sessions/converted_sessions,
    abandoned_sessions and weekly [{week (Monday ISO),active_users,events}]. Conversion requires a buy
    strictly after a view in the same session. Retention lists observed cohort/week offsets with users,
    cohort_users and rate rounded to 6 decimals; first observed week defines a user's cohort.
    """
    from datetime import datetime,timedelta
    weekly={};first={};user_weeks={}
    for event in events:
        day=datetime.fromisoformat(event['at']).date();week=day-timedelta(days=day.weekday())
        weekly.setdefault(week,{'users':set(),'events':0});weekly[week]['users'].add(event['user']);weekly[week]['events']+=1
        first[event['user']]=min(first.get(event['user'],week),week);user_weeks.setdefault(event['user'],set()).add(week)
    viewed=converted=0
    for session in sessions:
        views=[datetime.fromisoformat(e['at']) for e in session['events'] if e['type']=='view']
        buys=[datetime.fromisoformat(e['at']) for e in session['events'] if e['type']=='buy']
        viewed+=bool(views);converted+=bool(views and buys and max(buys)>min(views))
    cohorts={};groups={}
    for user,cohort in first.items():
        cohorts[cohort]=cohorts.get(cohort,0)+1
        for week in user_weeks[user]:groups.setdefault((cohort,(week-cohort).days//7),set()).add(user)
    retention=[{'cohort':str(cohort),'week_offset':offset,'users':len(users),'cohort_users':cohorts[cohort],'rate':round(len(users)/cohorts[cohort],6)} for (cohort,offset),users in sorted(groups.items())]
    summary={'events':len(events),'users':len(first),'sessions':len(sessions),'viewed_sessions':viewed,'converted_sessions':converted,'abandoned_sessions':viewed-converted,
             'weekly':[{'week':str(w),'active_users':len(v['users']),'events':v['events']} for w,v in sorted(weekly.items())]}
    return summary,retention

def export_analysis(lines, required):
    """Write summary.json, rejected.json, quality.json (sorted keys, indent=2), retention.csv (cohort,
    week_offset,users,cohort_users,rate; newline '\\n') and activity.svg. Quality counts nonblank input,
    accepted, rejected, accounted_for, and duplicate/invalid reason counts.
    """
    import csv,json
    from pathlib import Path
    from collections import Counter
    from charts import activity_chart
    events,rejected=parse_events(lines,required);sessions=sessionize(events);summary,retention=analyze(events,sessions)
    count=sum(bool(line.strip()) for line in lines)
    quality={'input':count,'accepted':len(events),'rejected':len(rejected),'accounted_for':len(events)+len(rejected)==count,'reasons':dict(sorted(Counter(r['reason'] for r in rejected).items()))}
    for name,value in [('summary.json',summary),('rejected.json',rejected),('quality.json',quality)]:Path(name).write_text(json.dumps(value,indent=2,sort_keys=True))
    with open('retention.csv','w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=['cohort','week_offset','users','cohort_users','rate'],lineterminator='\n');w.writeheader();w.writerows(retention)
    activity_chart(summary['weekly'])
    return summary
