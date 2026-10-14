from cleaning import normalize_customer, clean_customers, quality_report, export_quality

def normalization():
    source = {'id':'x','name':'  sAM  ','email':' SAM@EXAMPLE.COM ','custom':7}
    result = normalize_customer(source)
    assert result == {'id':'x','name':'Sam','email':'sam@example.com','custom':7}
    assert source['name'] == '  sAM  ' and normalize_customer(result) == result
    assert normalize_customer({'name':None})['name'] is None
    return True

def validation():
    rules={'required':['id','name','email'],'blocked_domains':['blocked.test']}
    rows=[{'id':'a','name':' A ','email':' A@OK.TEST '}, {'id':'b','name':'B','email':'a@ok.test'},
          {'id':'a','name':'Other','email':'other@ok.test'}, {'id':'c','name':'C','email':'@'},
          {'id':'d','name':'D','email':'d@blocked.test'}, {'id':'e','email':'e@ok.test'},
          {'id':'f','name':'F','email':'two words@ok.test'}]
    clean,rejected=clean_customers(rows,rules)
    assert [r['id'] for r in clean] == ['a']
    assert [r['reason'] for r in rejected] == ['duplicate email','duplicate id','invalid email','blocked domain','missing field','invalid email']
    assert rejected[0]['source_index']==1 and rejected[0]['record']==rows[1]
    assert clean_customers([],rules)==([],[])
    assert len(clean_customers([{'id':'z','name':'Z','email':'z@ok.test'}],{**rules,'blocked_domains':['ok.test']})[1])==1
    return True

def reconciliation():
    records=[{'id':'same'},{'id':'same'}]
    assert quality_report(records,[{'source_index':0}],[{'source_index':1,'reason':'duplicate id'}])['accounted_for']
    assert not quality_report(records,[{'source_index':0}],[{'source_index':0,'reason':'duplicate id'}])['accounted_for']
    assert quality_report([],[],[])['accounted_for']
    return True

def delivery():
    return verify_artifacts()
