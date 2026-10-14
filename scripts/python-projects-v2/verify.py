"""Independent local validation of generated projects, negative cases, and browser-produced ZIPs."""
import ast,json,os,subprocess,sys,tempfile,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
projects=json.loads((ROOT/'src/content/python/projects-v2/catalog.json').read_text())
results=[]
for project in projects:
    with tempfile.TemporaryDirectory() as folder:
        work=Path(folder)
        for name,text in {**project['files'],**project['reference']}.items():(work/name).write_text(text)
        subprocess.run([sys.executable,'main.py'],cwd=work,check=True,stdout=subprocess.DEVNULL)
        subprocess.run([sys.executable,'test_project.py'],cwd=work,check=True,stdout=subprocess.DEVNULL)
        module=next(name for name in project['reference'] if name not in ['main.py','charts.py'])
        tree=ast.parse(project['reference'][module]);function=next(n for n in tree.body if isinstance(n,ast.FunctionDef));function.body=[ast.Return(value=ast.Constant(None))]
        (work/module).write_text(ast.unparse(ast.fix_missing_locations(tree)))
        check=project['milestones'][0]['checks'][0]['function']
        broken=subprocess.run([sys.executable,'-B','-c',f'import _acceptance; assert _acceptance.{check}()'],cwd=work,capture_output=True)
        assert broken.returncode!=0,(project['slug'],'mutant escaped checks')
        for name,text in project['starters'].items():(work/name).write_text(text)
        starter=subprocess.run([sys.executable,'-B','main.py'],cwd=work,capture_output=True)
        assert starter.returncode!=0,(project['slug'],'unfinished starter passed')
    results.append({'project':project['slug'],'reference':'passed','mutated_function':'rejected','starter':'unfinished','milestones':len(project['milestones']),'datasets':[{k:d[k] for k in ['path','rows','schema']} for d in project['datasets']],'invariants':project['invariants']})
    print('PASS',project['slug'],'reference and negative cases')
archives=[]
for path in sorted((ROOT/'docs/python/projects-v2/screens').glob('*.zip')):
    project=next(p for p in projects if p['slug'] in path.name)
    with zipfile.ZipFile(path) as archive:
        assert archive.testzip() is None
        for name in project['artifacts']+list(project['reference'])+['test_project.py','verification.json']:
            assert name in archive.namelist(),(path,name)
        for name,text in project['reference'].items():assert archive.read(name).decode()==text,(path,name,'learner code differs')
        evidence=json.loads(archive.read('verification.json'));assert all(c['passed'] for c in evidence['checks'])
        if project['analytical']:assert len(archive.read('interpretation.md'))>=80
        # Execute the exported bundle in its own directory; tests verify captured artifact values.
        with tempfile.TemporaryDirectory() as folder:
            archive.extractall(folder)
            result=subprocess.run([sys.executable,'test_project.py'],cwd=folder,capture_output=True)
            assert result.returncode==0,(path,result.stderr.decode())
    archives.append(path.name)
report={'projects':results,'verified_browser_archives':archives}
(ROOT/'docs/python/projects-v2/verification.json').write_text(json.dumps(report,indent=2)+'\n')
print('Verified',len(archives),'actual browser downloads')
