# Restaurant Rezervasyon Sistemi

## Sistem Hakkında
Restaurant Rezervasyon Sistemi, kullanıcıların masa rezervasyonlarını güvenli ve düzenli bir şekilde yönetmelerini sağlar. Sistem hem ön yüz (React) hem de arka uç (Spring Boot) tarafında veri güvenliği ve yönetimi sağlar. Admin paneli üzerinden tüm rezervasyon ve müşteri işlemleri takip edilebilir.

---

## Temel Özellikler

### 1. Rezervasyon Kuralları
- Rezervasyonlar, planlanan rezervasyon saatinden **en fazla 1 saat öncesine kadar** yapılabilir.  
- Rezervasyon saatinden **1 saat sonra** rezervasyon otomatik olarak "Tamamlandı" durumuna geçer.  
- Aynı masaya aynı saat için birden fazla rezervasyon yapılamaz (**çakışmayı önleme**).  
- Rezervasyonlar **en fazla 3 ay sonrasına kadar** yapılabilir.  
- Geçmiş tarihli veya **çalışma saatleri dışında** rezervasyonlar kabul edilmez.  

### 2. Müşteri Yönetimi
- Daha önce rezervasyon yaptırmış müşterilerin bilgileri saklanır.  
- Bir sonraki rezervasyonda, **telefon numarasıyla hızlı rezervasyon** yapılabilir.  
- Müşteri isim güncellemeleri yalnızca **admin paneli** üzerinden yapılabilir.  
- Rezervasyon sırasında **isim ve telefon numarası zorunludur**.  

### 3. Veri Güvenliği ve Maskelenmesi
- Hem backend hem frontend tarafında müşteri ve rezervasyon verileri **maskelenmiş** olarak görüntülenir.  
- Admin panelinde veriler **maskelenmeden** tam olarak görüntülenebilir.  

### 4. Tarih ve Döküm
- Tüm rezervasyonlar ve müşteri kayıtlarının **oluşturulma tarihleri** tutulur.  
- Veriler gerektiğinde **Excel dosyası olarak dışa aktarılabilir**.  

### 5. Admin Paneli
- Admin paneli üzerinden **müşteri, rezervasyon ve masalar** kolayca yönetilebilir.  
- Admin panelinde gelişmiş **filtreleme ve arama** seçenekleri mevcuttur.  

---

## Teknolojiler
- **Backend:** Spring Boot, Spring Security, JPA, Hibernate  
- **Frontend:** React.js, Bootstrap  
- **Veritabanı:** H2 / MySQL (projeye göre)  

---

## Notlar
- Sistem, kullanıcı deneyimini ön planda tutar ve veri güvenliğini sağlar.  
- Rezervasyon ve müşteri verileri her zaman güncel tutulur.  
- Admin yetkisi olmayan kullanıcılar yalnızca maskelenmiş verilere erişebilir.  
