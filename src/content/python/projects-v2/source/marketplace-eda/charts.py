def cohort_chart(cohorts):
    """Plot cohort revenue by month from cohorts DataFrame. Save labeled cohorts.svg; retain unknown cohort."""
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    fig,ax=plt.subplots(figsize=(8,4))
    for cohort,group in cohorts.groupby('cohort'):
        ax.plot(group['month'],group['revenue_cents'],label=cohort,marker='o')
    ax.set(title='Monthly revenue by customer cohort',xlabel='Month',ylabel='Revenue (cents)');ax.legend(title='Cohort')
    fig.tight_layout();fig.savefig('cohorts.svg',metadata={'Date':None});plt.close(fig)
