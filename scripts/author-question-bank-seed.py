# Deterministic author-time generator for the question-bank seed. Edge cases are explicit.
def q(v):
    if v is None: return "NULL"
    if isinstance(v,(int,float)): return repr(v)
    return "'"+str(v).replace("'","''")+"'"
def ins(t,rows): return f"INSERT INTO {t} VALUES"+",".join("("+",".join(q(x) for x in r)+")" for r in rows)+";"

out=[]
out.append("""CREATE TABLE shoppers(id INTEGER PRIMARY KEY,name TEXT NOT NULL,email TEXT,region TEXT,signup_date TEXT NOT NULL);
CREATE TABLE catalog_items(id INTEGER PRIMARY KEY,name TEXT NOT NULL,category TEXT NOT NULL,price REAL NOT NULL);
CREATE TABLE sales_orders(id INTEGER PRIMARY KEY,shopper_id INTEGER NOT NULL REFERENCES shoppers(id),order_date TEXT NOT NULL,status TEXT NOT NULL,delivered_date TEXT);
CREATE TABLE order_lines(order_id INTEGER NOT NULL REFERENCES sales_orders(id),item_id INTEGER NOT NULL REFERENCES catalog_items(id),quantity INTEGER NOT NULL,unit_price REAL NOT NULL,PRIMARY KEY(order_id,item_id));
CREATE TABLE order_payments(id INTEGER PRIMARY KEY,order_id INTEGER NOT NULL,paid_at TEXT NOT NULL,amount REAL NOT NULL,method TEXT NOT NULL);
CREATE TABLE order_refunds(id INTEGER PRIMARY KEY,order_id INTEGER NOT NULL,refunded_at TEXT NOT NULL,amount REAL NOT NULL);
CREATE TABLE app_logins(shopper_id INTEGER NOT NULL,login_date TEXT NOT NULL);
CREATE TABLE shopper_snapshots(snapshot_date TEXT NOT NULL,shopper_id INTEGER NOT NULL,region TEXT,PRIMARY KEY(snapshot_date,shopper_id));
CREATE TABLE departments(id INTEGER PRIMARY KEY,name TEXT NOT NULL,location TEXT NOT NULL,budget REAL NOT NULL);
CREATE TABLE employees(id INTEGER PRIMARY KEY,name TEXT NOT NULL,manager_id INTEGER REFERENCES employees(id),department_id INTEGER REFERENCES departments(id),title TEXT NOT NULL,salary REAL NOT NULL,hired_at TEXT NOT NULL);
CREATE TABLE salary_history(employee_id INTEGER NOT NULL,salary REAL NOT NULL,valid_from TEXT NOT NULL,valid_to TEXT);
CREATE TABLE performance_reviews(id INTEGER PRIMARY KEY,employee_id INTEGER NOT NULL,review_date TEXT NOT NULL,rating INTEGER NOT NULL);""".replace("\n",""))

shoppers=[
 (1,'Ana Ruiz','ana@harbor.test','West','2025-01-03'),
 (2,'Ben Okafor','ben@harbor.test','East','2025-01-05'),
 (3,'Chloe Park','chloe@harbor.test','West','2025-01-09'),
 (4,'Dmitri Volkov','dmitri@harbor.test','North','2025-01-14'),
 (5,'Esi Mensah',None,'South','2025-01-20'),
 (6,'Farah Aziz','  ANA@harbor.test ','East','2025-02-02'),   # duplicate of Ana after trim/lower
 (7,'Gus Lindqvist','gus@harbor.test','North','2025-02-06'),
 (8,'Hana Sato','hana@harbor.test',None,'2025-02-11'),          # NULL region
 (9,'Ivan Petrov','ivan@harbor.test','West','2025-02-18'),
 (10,'Jade Wu','ben@harbor.test','South','2025-01-28'),   # Jan cohort of 6 -> non-integer retention         # exact duplicate email of Ben
 (11,'Kofi Boateng','kofi@harbor.test','East','2025-03-01'),   # boundary: first day of March
 (12,'Lena Fischer','lena@harbor.test','West','2025-03-10'),
 (13,'Mo Haddad','Mo@Harbor.test','South','2025-03-15'),
 (14,'Nia Brooks','nia@harbor.test','North','2025-03-21'),
 (15,'Oskar Berg','oskar@harbor.test','East','2025-03-28'),
 (16,'Priya Nair','priya@harbor.test','South','2025-03-31'),    # boundary: signs up on the last day of March, never orders
 (17,'Rafa Silva','rafa@harbor.test','North','2025-04-02'),     # after the March window, never orders
]
out.append(ins('shoppers',shoppers))
items=[
 (1,'Desk Lamp','Lighting',39.0),(2,'Floor lamp','Lighting',89.0),(3,'String Lights','Lighting',19.5),
 (4,'Chef Knife','Kitchen',59.0),(5,'Cast Iron Pan','Kitchen',45.0),(6,'Pour-over Kettle','Kitchen',45.0),   # price tie in Kitchen
 (7,'Garden Hose','Garden',25.0),(8,'Pruning Shears','Garden',24.0),(9,'Seed Starter Kit','Garden',15.0),
 (10,'Notebook Set','Office',12.0),(11,'Monitor Arm','Office',89.0),(12,'Ergonomic Chair','Office',249.0),  # Floor lamp & Monitor Arm tie at 89
 (13,'Wall Clock','Office',34.0),   # never ordered
]
out.append(ins('catalog_items',items))
# orders: id, shopper, date, status, delivered_date
orders=[
 (101,1,'2025-01-04','delivered','2025-01-08'),
 (102,2,'2025-01-06','delivered','2025-01-07'),
 (103,1,'2025-01-15','delivered','2025-01-20'),
 (104,3,'2025-01-18','cancelled',None),
 (105,4,'2025-01-22','delivered','2025-01-31'),
 (106,2,'2025-01-31','delivered','2025-02-03'),   # month boundary (Jan 31)
 (107,5,'2025-02-01','delivered','2025-02-04'),   # Feb 1 boundary
 (108,6,'2025-02-03','delivered','2025-02-05'),
 (109,1,'2025-02-10','delivered','2025-02-12'),
 (110,7,'2025-02-12','shipped',None),
 (111,3,'2025-02-14','delivered','2025-02-20'),
 (112,8,'2025-02-15','delivered',None),          # data-quality case: delivered but date missing
 (113,9,'2025-02-19','processing',None),
 (114,2,'2025-02-21','delivered','2025-02-24'),
 (115,4,'2025-02-27','cancelled',None),
 (116,10,'2025-03-01','delivered','2025-03-04'),
 (117,1,'2025-03-03','delivered','2025-03-06'),
 (118,6,'2025-03-05','delivered','2025-03-09'),
 (119,11,'2025-03-06','delivered','2025-03-10'),
 (120,3,'2025-03-08','delivered','2025-03-13'),
 (121,12,'2025-03-12','shipped',None),
 (122,7,'2025-03-13','delivered','2025-03-18'),   # leaves 2025-03-14 without orders
 (123,2,'2025-03-17','delivered','2025-03-19'),
 (124,13,'2025-03-20','delivered','2025-03-25'),
 (125,9,'2025-03-22','delivered','2025-03-27'),
 (126,14,'2025-03-25','processing',None),
 (127,5,'2025-03-27','delivered','2025-03-31'),
 (128,1,'2025-03-31','delivered','2025-04-02'),   # Mar 31 boundary
 (129,8,'2025-04-01','delivered','2025-04-04'),   # Apr 1 boundary
 (130,12,'2025-04-03','delivered','2025-04-08'),
 (131,3,'2025-04-05','cancelled',None),
 (132,15,'2025-04-07','delivered','2025-04-10'),
 (133,13,'2025-04-09','shipped',None),           # shipped outside the Feb-Mar window
]
out.append(ins('sales_orders',orders))
price={i[0]:i[3] for i in items}
lines_spec={
 101:[(1,1),(3,2)],102:[(4,1)],103:[(5,1),(10,3)],104:[(12,1)],105:[(2,1),(1,1)],106:[(7,2),(8,1)],
 107:[(6,1)],108:[(11,1),(10,2)],109:[(3,4)],110:[(9,3),(8,1)],111:[(4,1),(5,1),(6,1)],112:[(1,2)],
 113:[(12,1)],114:[(11,1)],115:[(7,1)],116:[(2,1)],117:[(10,1)],118:[(5,2)],119:[(9,2),(7,1)],
 120:[(11,1),(3,1)],121:[(6,1)],122:[(4,1),(1,1)],123:[(8,2)],124:[(5,1)],125:[(2,1),(11,1)],
 126:[(10,5)],127:[(1,1)],128:[(4,2)],129:[(3,2),(9,1)],130:[(12,1),(10,1)],131:[(6,2)],132:[(8,1),(7,1)],133:[(2,1)],
}
lines=[]
for o,ls in lines_spec.items():
    for it,qty in ls:
        up=price[it]
        if o==118: up=42.0   # discounted line: unit_price differs from list price
        lines.append((o,it,qty,up))
out.append(ins('order_lines',lines))
tot={o:round(sum(q*(42.0 if o==118 else price[i]) for i,q in ls),2) for o,ls in lines_spec.items()}
pays=[];pid=1
for o,s,d,st,dd in orders:
    if st=='cancelled' or o in (113,126,121): continue   # unpaid: cancelled, processing, one shipped (121) never paid
    amt=tot[o]
    if o==105:  # split payment
        pays.append((pid,o,'2025-01-22',90.0,'card'));pid+=1
        pays.append((pid,o,'2025-01-23',round(amt-90.0,2),'gift_card'));pid+=1
    elif o==119:  # underpaid
        pays.append((pid,o,'2025-03-06',round(amt-10.0,2),'card'));pid+=1
    elif o==125:  # overpaid then two payments
        pays.append((pid,o,'2025-03-22',100.0,'card'));pid+=1
        pays.append((pid,o,'2025-03-23',round(amt-100.0+5.0,2),'paypal'));pid+=1
    else:
        pays.append((pid,o,d,amt,'paypal' if o%3==0 else 'card'));pid+=1
out.append(ins('order_payments',pays))
refunds=[(1,103,'2025-01-25',15.0),(2,106,'2025-02-06',tot[106]),(3,111,'2025-02-25',59.0),(4,111,'2025-02-26',45.0),(5,122,'2025-03-20',10.0),(6,129,'2025-04-06',tot[129])]
out.append(ins('order_refunds',refunds))
logins=[]
def run(s,start,days):
    import datetime
    d=datetime.date.fromisoformat(start)
    for k in range(days): logins.append((s,(d+datetime.timedelta(days=k)).isoformat()))
run(1,'2025-03-01',4); run(1,'2025-03-07',2); run(1,'2025-03-10',5)   # longest 5 (Mar 10-14)
logins.append((1,'2025-03-11'))  # duplicate same-day login
run(2,'2025-03-02',3); run(2,'2025-03-06',3)                           # tie 3 & 3
run(3,'2025-03-01',1); run(3,'2025-03-03',1)
run(4,'2025-02-27',4)                                                    # crosses month boundary Feb 27 - Mar 2
logins.append((4,'2025-02-28'))
run(6,'2025-03-05',2)
run(9,'2025-03-14',6)
logins.append((9,'2025-03-16'));logins.append((9,'2025-03-16'))
out.append(ins('app_logins',logins))
snap=[]
regions={1:['West','West','West','East'],2:['East','East','East','East'],3:['West','North','North','West'],5:['South',None,'South','South'],8:[None,None,'West','West']}
dates=['2025-01-31','2025-02-28','2025-03-31','2025-04-30']
for s,rs in regions.items():
    for d,r in zip(dates,rs): snap.append((d,s,r))
out.append(ins('shopper_snapshots',snap))
depts=[(1,'Engineering','Lisbon',1100000.0),(2,'Sales','Austin',450000.0),(3,'Finance','Austin',250000.0),(4,'People','Lisbon',150000.0),(5,'Design','Remote',305000.0),(6,'Research','Lisbon',120000.0)]  # Design payroll == budget  # Research: no employees
out.append(ins('departments',depts))
emps=[
 (1,'Ada Moreno',None,None,'CEO',250000.0,'2019-03-01'),
 (2,'Bruno Costa',1,1,'VP Engineering',180000.0,'2019-06-15'),
 (3,'Carmen Diaz',1,2,'VP Sales',150000.0,'2020-01-10'),
 (4,'Dev Patel',2,1,'Engineering Manager',140000.0,'2020-05-04'),
 (5,'Elif Kaya',4,1,'Senior Engineer',145000.0,'2021-02-01'),   # earns more than manager (Dev)
 (6,'Femi Adeyemi',4,1,'Engineer',120000.0,'2022-07-18'),
 (7,'Greta Holm',4,1,'Engineer',120000.0,'2023-01-09'),          # tie with Femi
 (8,'Hugo Brandt',2,1,'Staff Engineer',185000.0,'2020-09-01'),   # earns more than manager (Bruno)
 (9,'Ines Silva',3,2,'Account Executive',95000.0,'2021-11-15'),
 (10,'Jonas Weber',3,2,'Account Executive',95000.0,'2023-03-20'),
 (11,'Kai Tanaka',3,2,'Sales Engineer',150000.0,'2022-02-14'),    # equal to manager (not more)
 (12,'Lara Rossi',1,3,'Finance Lead',130000.0,'2020-02-03'),
 (13,'Milo Novak',12,3,'Analyst',85000.0,'2023-01-01'),   # boundary: first day of 2023
 (14,'Nora Kim',1,4,'People Lead',110000.0,'2021-04-12'),
 (15,'Omar Farouk',14,4,'Recruiter',110000.0,'2024-01-08'),  # People has one distinct salary
 (16,'Pia Larsen',1,5,'Design Lead',125000.0,'2022-03-01'),
 (17,'Quinn Avery',16,5,'Designer',90000.0,'2023-12-31'),  # boundary: last day of 2023
 (18,'Rui Santos',16,5,'Designer',90000.0,'2024-02-19'),
 (19,'Sana Iqbal',None,None,'Contractor',60000.0,'2024-05-06'),   # no manager, no department (not CEO)
 (20,'Tomas Ilic',5,1,'Engineer',110000.0,'2024-08-26'),          # depth 4 under CEO
]
out.append(ins('employees',emps))
hist=[
 (2,165000.0,'2019-06-15','2022-01-01'),(2,180000.0,'2022-01-01',None),
 (4,120000.0,'2020-05-04','2022-04-01'),(4,140000.0,'2022-04-01',None),
 (5,118000.0,'2021-02-01','2022-02-01'),(5,130000.0,'2022-02-01','2024-02-01'),(5,145000.0,'2024-02-01',None),
 (6,105000.0,'2022-07-18','2024-01-01'),(6,120000.0,'2023-11-01',None),   # OVERLAP: starts before previous ends
 (7,120000.0,'2023-01-09',None),
 (8,170000.0,'2020-09-01','2023-03-01'),(8,185000.0,'2023-03-01',None),
 (9,88000.0,'2021-11-15','2023-01-01'),(9,95000.0,'2023-01-01',None),
 (11,140000.0,'2022-02-14','2024-06-01'),(11,150000.0,'2024-06-01',None),
 (13,80000.0,'2023-01-01','2024-07-01'),(13,85000.0,'2024-06-15',None),   # OVERLAP
 (17,85000.0,'2023-12-31','2024-09-11'),(17,90000.0,'2024-09-11',None),
 (20,110000.0,'2024-08-26',None),
]
out.append(ins('salary_history',hist))
reviews=[(1,2,'2021-12-15',4),(2,4,'2022-04-01',5),(3,5,'2022-01-31',4),(4,5,'2024-02-01',5),(5,6,'2023-12-15',3),(6,8,'2023-03-01',5),(7,9,'2022-12-31',3),(8,11,'2024-06-01',4),(9,13,'2024-06-20',4),(10,17,'2024-09-10',3),(11,20,'2025-02-01',4),(12,5,'2021-02-01',3),(13,10,'2024-03-01',4)]  # 13: no salary history
out.append(ins('performance_reviews',reviews))
print("\n".join(out))
