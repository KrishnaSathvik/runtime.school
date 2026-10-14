def revenue_chart(metrics):
    """Generate revenue.svg from the daily net totals. Label date and net revenue (cents)."""
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    totals={}
    for r in metrics:totals[r['date']]=totals.get(r['date'],0)+r['net_cents']
    days=sorted(totals);fig,ax=plt.subplots(figsize=(8,3))
    ax.plot(days,[totals[d] for d in days]);ax.set(title='Daily net revenue',xlabel='Date',ylabel='Net revenue (cents)')
    ax.set_xticks(days[::max(1,len(days)//5)]);fig.tight_layout();fig.savefig('revenue.svg',metadata={'Date':None});plt.close(fig)
