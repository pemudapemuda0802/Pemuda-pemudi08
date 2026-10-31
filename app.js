
(() => {
  const $ = id => document.getElementById(id);
  const DUES = 50000, YEAR = new Date().getFullYear();
  const money = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
  const dateFmt = d => d ? new Date(d+'T00:00:00').toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}) : '—';

  let db, user, profile, residents=[], payments=[];

  const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isAdmin = () => profile?.role === 'admin';

  function notice(msg, bad=false){
    const n=$('notice');
    n.textContent=msg;
    n.className='notice '+(bad?'bad':'');
    setTimeout(()=>n.classList.add('hidden'),4500);
  }

  function configReady(){
    return window.SUPABASE_URL?.startsWith('https://') &&
      window.SUPABASE_ANON_KEY &&
      !window.SUPABASE_ANON_KEY.includes('TEMPEL');
  }

  function showLogin(){
    $('loginView').classList.remove('hidden');
    $('appView').classList.add('hidden');
  }

  function showApp(){
    $('loginView').classList.add('hidden');
    $('appView').classList.remove('hidden');
  }

  async function loadProfile(){
    const {data,error}=await db.from('profiles')
      .select('id,role,full_name')
      .eq('id',user.id).single();

    if(error) throw new Error('Profil akun belum tersedia. Minta admin menjalankan SQL setup dan memberi peran akun.');
    profile=data;
  }

  async function loadData(){
    const [r,p]=await Promise.all([
      db.from('residents').select('*').order('name'),
      db.from('payments').select('*, residents(name)').order('paid_at',{ascending:false})
    ]);

    if(r.error) throw r.error;
    if(p.error) throw p.error;

    residents=r.data||[];
    payments=p.data||[];
    render();
  }

  const paidByResident = id =>
    payments.filter(p=>p.resident_id===id && Number(p.year)===YEAR)
      .reduce((a,p)=>a+Number(p.amount),0);

  const paidTotal = () =>
    payments.filter(p=>Number(p.year)===YEAR)
      .reduce((a,p)=>a+Number(p.amount),0);

  function status(id){
    return paidByResident(id)>=DUES?'Lunas':'Belum lunas';
  }

  function render(){
    $('userEmail').textContent=profile.full_name||user.email;
    $('userRole').textContent=isAdmin()?'Administrator':'Warga';

    document.querySelectorAll('.admin-only')
      .forEach(el=>el.classList.toggle('hidden',!isAdmin()));

    const total=paidTotal();
    const target=residents.length*DUES;
    const paid=residents.filter(r=>status(r.id)==='Lunas').length;
    const percent=target?Math.min(100,Math.round(total/target*100)):0;

    $('yearLabel').textContent='TAHUN '+YEAR;
    $('progressYear').textContent=YEAR;
    $('footerYear').textContent=YEAR;
    $('statIncome').textContent=money(total);
    $('statResidents').textContent=residents.length;
    $('statPaid').textContent=paid;
    $('statDue').textContent=residents.length-paid;
    $('progressPercent').textContent=percent+'%';
    $('progressText').textContent=money(total)+' terkumpul';
    $('progressBar').style.width=percent+'%';
    $('progressPaid').textContent=paid+' warga lunas';
    $('progressCount').textContent=residents.length+' warga';

    $('recentRows').innerHTML=payments.slice(0,5).map(p=>
      `<tr>
        <td>${dateFmt(p.paid_at)}</td>
        <td><strong>${esc(p.residents?.name||'Warga')}</strong></td>
        <td>${esc(p.note||'Pembayaran iuran')}</td>
        <td class="amount">${money(p.amount)}</td>
      </tr>`
    ).join('')||emptyRow(4,'Belum ada pembayaran.');

    renderResidents();
    renderPayments();
    renderReport();
  }

  function emptyRow(n,msg){
    return `<tr><td colspan="${n}" class="empty">${msg}</td></tr>`;
  }

  function renderResidents(){
    const q=$('residentSearch').value.toLowerCase();
    const rows=residents.filter(r=>
      (r.name+' '+(r.address||'')).toLowerCase().includes(q)
    );

    $('residentCount').textContent=rows.length+' warga';

    $('residentRows').innerHTML=rows.map(r=>
      `<tr>
        <td><strong>${esc(r.name)}</strong></td>
        <td>${esc(r.address||'—')}</td>
        <td>${esc(r.phone||'—')}</td>
        <td>
          <span class="status ${status(r.id)==='Lunas'?'paid':'due'}">${status(r.id)}</span>
          <small class="sub-status">${money(Math.min(DUES,paidByResident(r.id)))} / ${money(DUES)}</small>
        </td>
        <td class="admin-only">
          ${isAdmin()?`<button class="row-action" data-edit="${r.id}">Edit</button>
          <button class="row-action danger" data-delete="${r.id}">Hapus</button>`:''}
        </td>
      </tr>`
    ).join('')||emptyRow(isAdmin()?5:4,'Data warga belum tersedia.');

    document.querySelectorAll('[data-edit]')
      .forEach(b=>b.onclick=()=>editResident(b.dataset.edit));

    document.querySelectorAll('[data-delete]')
      .forEach(b=>b.onclick=()=>deleteResident(b.dataset.delete));
  }

  function renderPayments(){
    const q=$('paymentSearch').value.toLowerCase();
    const rows=payments.filter(p=>
      (p.residents?.name||'').toLowerCase().includes(q)
    );

    $('paymentRows').innerHTML=rows.map(p=>
      `<tr>
        <td>${dateFmt(p.paid_at)}</td>
        <td><strong>${esc(p.residents?.name||'Warga')}</strong></td>
        <td>${p.year}</td>
        <td class="amount">${money(p.amount)}</td>
        <td>${esc(p.note||'—')}</td>
        <td class="admin-only">
          ${isAdmin()?`<button class="row-action danger" data-delete-payment="${p.id}">Hapus</button>`:''}
        </td>
      </tr>`
    ).join('')||emptyRow(isAdmin()?6:5,'Belum ada transaksi.');

    document.querySelectorAll('[data-delete-payment]')
      .forEach(b=>{
        b.onclick=()=>deletePayment(b.dataset.deletePayment);
      });
  }

  function renderReport(){
    const total=paidTotal();
    const target=residents.length*DUES;

    $('reportIncome').textContent=money(total);
    $('reportTarget').textContent=money(target);
    $('reportRemaining').textContent=money(Math.max(0,target-total));

    $('reportRows').innerHTML=residents.map(r=>{
      const paid=paidByResident(r.id);
      const remain=Math.max(0,DUES-paid);

      return `<tr>
        <td><strong>${esc(r.name)}</strong></td>
        <td>${money(DUES)}</td>
        <td class="amount">${money(paid)}</td>
        <td>${money(remain)}</td>
        <td><span class="status ${remain===0?'paid':'due'}">${remain===0?'Lunas':'Belum lunas'}</span></td>
      </tr>`;
    }).join('')||emptyRow(5,'Belum ada data warga.');
  }

  function goto(page){
    document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));
    $('page-'+page).classList.remove('hidden');

    document.querySelectorAll('.nav-link')
      .forEach(b=>b.classList.toggle('active',b.dataset.page===page));

    $('pageTitle').textContent={
      dashboard:'Ringkasan',
      residents:'Data warga',
      payments:'Pembayaran',
      reports:'Laporan'
    }[page];
  }

  async function editResident(id){
    const r=residents.find(x=>x.id===id);
    if(!r)return;

    $('residentDialogTitle').textContent='Edit warga';
    $('residentId').value=r.id;
    $('residentName').value=r.name;
    $('residentAddress').value=r.address||'';
    $('residentPhone').value=r.phone||'';
    $('residentDialog').showModal();
  }

  async function deleteResident(id){
    const r=residents.find(x=>x.id===id);
    if(!r||!confirm(`Hapus data ${r.name}? Data yang memiliki transaksi tidak bisa dihapus.`))return;

    const {error}=await db.from('residents').delete().eq('id',id);

    if(error){
      notice(error.message,true);
      return;
    }

    await loadData();
    notice('Data warga dihapus.');
  }

  async function deletePayment(id){
    if(!isAdmin())return;

    const p=payments.find(x=>String(x.id)===String(id));
    if(!p)return;

    const nama=p.residents?.name||'Warga';

    if(!confirm(`Hapus pembayaran ${nama} sebesar ${money(p.amount)} tanggal ${dateFmt(p.paid_at)}? Tindakan ini tidak bisa dibatalkan.`))return;

    const {error}=await db.from('payments').delete().eq('id',id);

    if(error){
      notice('Gagal menghapus transaksi: '+error.message,true);
      return;
    }

    await loadData();
    notice('Transaksi pembayaran berhasil dihapus.');
  }

  async function saveResident(e){
    e.preventDefault();
    if(!isAdmin())return;

    const id=$('residentId').value;
    const payload={
      name:$('residentName').value.trim(),
      address:$('residentAddress').value.trim(),
      phone:$('residentPhone').value.trim()
    };

    const result=id
      ?await db.from('residents').update(payload).eq('id',id)
      :await db.from('residents').insert(payload);

    if(result.error){
      notice(result.error.message,true);
      return;
    }

    $('residentDialog').close();
    $('residentForm').reset();
    await loadData();
    notice('Data warga berhasil disimpan.');
  }

  async function savePayment(e){
    e.preventDefault();
    if(!isAdmin())return;

    const payload={
      resident_id:$('paymentResident').value,
      paid_at:$('paymentDate').value,
      amount:Number($('paymentAmount').value),
      year:YEAR,
      note:$('paymentNote').value.trim(),
      created_by:user.id
    };

    if(!payload.resident_id||payload.amount<=0)return;

    const already=paidByResident(payload.resident_id);

    if(already>=DUES){
      if(!confirm('Iuran warga ini sudah lunas. Tetap catat pembayaran tambahan?'))return;
    }

    const {error}=await db.from('payments').insert(payload);

    if(error){
      notice(error.message,true);
      return;
    }

    $('paymentDialog').close();
    $('paymentForm').reset();
    $('paymentDate').value=new Date().toISOString().slice(0,10);
    await loadData();
    notice('Pembayaran berhasil dicatat.');
  }

  function fillResidents(){
    $('paymentResident').innerHTML=residents.map(r=>
      `<option value="${r.id}">${esc(r.name)} — sisa ${money(Math.max(0,DUES-paidByResident(r.id)))}</option>`
    ).join('');
  }

  async function startSession(session){
    user=session.user;

    try{
      await loadProfile();
      showApp();
      await loadData();
      fillResidents();
    }catch(e){
      await db.auth.signOut();
      showLogin();
      $('loginError').textContent=e.message;
    }
  }

  $('loginForm').addEventListener('submit',async e=>{
    e.preventDefault();
    $('loginError').textContent='';

    if(!configReady()){
      $('loginError').textContent='Isi URL dan anon key Supabase terlebih dahulu di config.js.';
      return;
    }

    const {data,error}=await db.auth.signInWithPassword({
      email:$('email').value,
      password:$('password').value
    });

    if(error){
      $('loginError').textContent='Login gagal. Periksa email dan kata sandi.';
      return;
    }

    await startSession(data);
  });

  $('logoutBtn').onclick=async()=>{
    await db.auth.signOut();
    location.reload();
  };

  document.querySelectorAll('.nav-link')
    .forEach(b=>b.onclick=()=>goto(b.dataset.page));

  document.querySelectorAll('[data-goto]')
    .forEach(b=>b.onclick=()=>goto(b.dataset.goto));

  document.querySelectorAll('[data-close]')
    .forEach(b=>b.onclick=()=>$(b.dataset.close).close());

  $('addResidentBtn').onclick=()=>{
    $('residentForm').reset();
    $('residentId').value='';
    $('residentDialogTitle').textContent='Tambah warga';
    $('residentDialog').showModal();
  };

  $('addPaymentBtn').onclick=()=>{
    if(!residents.length){
      notice('Tambahkan data warga terlebih dahulu.',true);
      return;
    }

    fillResidents();
    $('paymentForm').reset();
    $('paymentDate').value=new Date().toISOString().slice(0,10);
    $('paymentDialog').showModal();
  };

  $('residentForm').onsubmit=saveResident;
  $('paymentForm').onsubmit=savePayment;
  $('residentSearch').oninput=renderResidents;
  $('paymentSearch').oninput=renderPayments;
  $('printBtn').onclick=()=>window.print();

  if(configReady()&&window.supabase){
    db=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_ANON_KEY);

    db.auth.getSession().then(({data})=>{
      if(data.session)startSession(data.session);
    });

    db.auth.onAuthStateChange((_event,session)=>{
      if(!session)showLogin();
    });
  }else{
    $('loginError').textContent='Aplikasi siap dikonfigurasi. Isi URL dan anon key Supabase di config.js.';
  }
})();
