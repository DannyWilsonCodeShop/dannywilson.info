import SwiftUI
import WebKit

struct ContentView: View {
    var body: some View {
        VStack(spacing: 0) {
            // Burnt orange status bar area
            Color(red: 0.922, green: 0.369, blue: 0.129) // #eb5e21
                .frame(height: 0)
                .background(Color(red: 0.922, green: 0.369, blue: 0.129))
                .ignoresSafeArea(edges: .top)
            
            WebView(url: URL(string: "https://dannywilson.info/flashcards.html")!)
        }
        .background(
            VStack(spacing: 0) {
                Color(red: 0.922, green: 0.369, blue: 0.129) // top
                Color(red: 0.051, green: 0.051, blue: 0.051) // bottom #0d0d0d
            }
            .ignoresSafeArea()
        )
    }
}

struct WebView: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.051, green: 0.051, blue: 0.051, alpha: 1.0) // #0d0d0d
        webView.scrollView.bounces = false
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

#Preview {
    ContentView()
}
