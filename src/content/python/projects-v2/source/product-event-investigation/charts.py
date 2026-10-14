def activity_chart(weekly):
    """Plot weekly active users from the supplied summary to activity.svg, labeling week and active users."""
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    fig,ax=plt.subplots(figsize=(8,3));ax.plot([r['week'] for r in weekly],[r['active_users'] for r in weekly],marker='o')
    ax.set(title='Weekly product activity',xlabel='Week',ylabel='Active users');ax.tick_params(axis='x',rotation=30)
    fig.tight_layout();fig.savefig('activity.svg',metadata={'Date':None});plt.close(fig)
