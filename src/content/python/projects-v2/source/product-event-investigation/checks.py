from analytics import parse_events,sessionize,analyze
import json

def quality():
    good={'id':'a','user':'u','type':'view','at':'2026-01-05T10:00:00+00:00'}
    events,rejects=parse_events([json.dumps(good),json.dumps(good),'bad',json.dumps({'id':'z'}),''],['id','user','type','at'])
    assert events==[good] and [r['reason'] for r in rejects]==['duplicate','invalid','invalid'] and rejects[0]['line']==2
    return True

def sessions():
    rows=[{'id':str(i),'user':'u','type':'view','at':at} for i,at in enumerate(['2026-01-05T10:00:00+00:00','2026-01-05T10:30:00+00:00','2026-01-05T11:01:00+00:00'])]
    result=sessionize(list(reversed(rows)))
    assert [len(s['events']) for s in result]==[2,1] and result[1]['id']=='u:2'
    assert sessionize([])==[] and rows[0]['id']=='0'
    return True

def funnel():
    rows=[{'id':'a','user':'u','type':'buy','at':'2026-01-05T10:00:00+00:00'}, {'id':'b','user':'u','type':'view','at':'2026-01-05T10:01:00+00:00'}, {'id':'c','user':'u','type':'view','at':'2026-01-12T10:00:00+00:00'}, {'id':'d','user':'u','type':'buy','at':'2026-01-12T10:02:00+00:00'}]
    summary,retention=analyze(rows,sessionize(rows))
    assert summary['sessions']==2 and summary['converted_sessions']==1 and summary['abandoned_sessions']==1
    assert retention==[{'cohort':'2026-01-05','week_offset':0,'users':1,'cohort_users':1,'rate':1.0},{'cohort':'2026-01-05','week_offset':1,'users':1,'cohort_users':1,'rate':1.0}]
    assert analyze([],[])[0]['users']==0
    return True

def chart():
    from charts import activity_chart
    from pathlib import Path
    activity_chart([{'week':'2026-01-05','active_users':3},{'week':'2026-01-12','active_users':2}])
    assert '<svg' in Path('activity.svg').read_text()
    if Path('summary.json').exists():activity_chart(json.loads(Path('summary.json').read_text())['weekly'])
    return True

def delivery():return verify_artifacts()
