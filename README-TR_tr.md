# AI-Powered Video Generation Project

[English](README.md) | Türkçe

Bu proje, metin-ses dönüşümü, görüntü ve video içeriği ile altyazıları birleştirerek ilgi çekici kısa formlu videolar oluşturan yapay zeka destekli bir video üretim sistemidir. TikTok, Instagram Reels ve YouTube Shorts gibi platformlar için uygun yüksek kaliteli, dikey formatta (9:16 en boy oranı) videolar üretmek için çeşitli API'ler ve hizmetleri kullanır.

## Özellikler

- OpenAI'nin GPT modeli kullanarak hikaye içeriği oluşturma
- AWS Polly kullanarak metni sese dönüştürme
- Pixabay'den ilgili görüntü ve videoları çekme
- Medyayı işleme ve tek bir videoda birleştirme
- Son videoya altyazı ekleme
- Dikey video formatı için optimize edilmiş (9:16 en boy oranı)
- Yapılandırılabilir video ve ses ayarları

## Ön Koşullar

Başlamadan önce, aşağıdaki gereksinimleri karşıladığınızdan emin olun:

- Node.js (v14 veya daha yeni)
- Sisteminizde FFmpeg yüklü olmalı
- OpenAI, AWS ve Pixabay için API anahtarları

## Kurulum

1. Depoyu klonlayın:
   ```
   git clone https://github.com/botanoz/ai-video-generation.git
   cd ai-video-generation
   ```

2. Bağımlılıkları yükleyin:
   ```
   npm install
   ```

3. Kök dizinde bir `.env` dosyası oluşturun ve API anahtarlarınızı ekleyin:
   ```
   AWS_ACCESS_KEY_ID=aws_erisim_anahtariniz
   AWS_SECRET_ACCESS_KEY=aws_gizli_anahtariniz
   AWS_REGION=aws_bolgeniz
   OPENAI_API_KEY=openai_api_anahtariniz
   PIXABAY_API_KEY=pixabay_api_anahtariniz
   ```

4. `config.js` dosyasını tercih ettiğiniz ayarlarla güncelleyin.

## Kullanım

Bir video oluşturmak için, `/api/v1/create-video` uç noktasına giriş metnini içeren bir JSON gövdesiyle POST isteği gönderin:

```json
{
  "input": "Giriş metniniz veya ipucunuz buraya"
}
```

Sunucu isteği işleyecek ve oluşturulan video, ses ve altyazı dosyalarının URL'lerini içeren bir JSON yanıtı döndürecektir.

## Proje Yapısı

- `audio/`: Oluşturulan ses dosyalarının saklandığı dizin
- `errors/`: Hata günlüklerinin saklandığı dizin
- `logs/`: Bilgi günlüklerinin saklandığı dizin
- `routes/`: Rota işleyicileri ve API entegrasyonlarını içerir
  - `utils/`: Çeşitli işlemler için yardımcı fonksiyonlar
- `subtitles/`: Oluşturulan altyazı dosyalarının saklandığı dizin
- `temp_files/`: İşlem sırasında kullanılan geçici dosyalar için dizin
- `videos/`: Son oluşturulan video dosyalarının saklandığı dizin
- `config.js`: Proje için yapılandırma dosyası
- `index.js`: Ana uygulama dosyası

## Yapılandırma

`config.js` dosyasında çeşitli ayarları değiştirebilirsiniz, bunlar arasında:

- Video çözünürlüğü ve en boy oranı
- Kare hızı ve bit hızı
- FFmpeg kodlama ayarları
- Altyazı görünümü

## API Entegrasyonları

Bu proje aşağıdaki API'lerle entegre çalışır:

- Hikaye oluşturma için OpenAI GPT
- Metin-ses dönüşümü için AWS Polly
- Görüntü ve video çekmek için Pixabay

## Katkıda Bulunma

Bu projeye katkılarınızı bekliyoruz. Lütfen şu adımları izleyin:

1. Depoyu fork edin
2. Özelliğiniz veya hata düzeltmeniz için yeni bir dal oluşturun. Dalınız için açıklayıcı bir isim kullanın ve "feature/" veya "bugfix/" ön ekiyle başlayın. Örneğin:
   ```
   git checkout -b feature/otomatik-kucuk-resim-olusturma
   ```
   veya
   ```
   git checkout -b bugfix/ses-senkronizasyon-sorunu-duzeltme
   ```
3. Bu dalda değişikliklerinizi yapın
4. Değişikliklerinizi açık ve açıklayıcı bir commit mesajıyla commit edin. Örneğin:
   ```
   git commit -am 'Otomatik küçük resim oluşturma özelliği eklendi'
   ```
5. Dalınıza push yapın:
   ```
   git push origin feature/otomatik-kucuk-resim-olusturma
   ```
6. Fork ettiğiniz depodan ana depomuza yeni bir Pull Request oluşturun

Lütfen kodunuzun kodlama standartlarımıza uyduğundan emin olun ve yeni özellikler için testler ekleyin. Bu projeyi geliştirmek için katkılarınızı takdir ediyoruz!

## Lisans

Bu proje MIT Lisansı altında lisanslanmıştır. Detaylar için `LICENSE` dosyasına bakın.

## İletişim

Herhangi bir sorunuz veya geri bildiriminiz varsa, lütfen GitHub deposunda bir konu açın.

