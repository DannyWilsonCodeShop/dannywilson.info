import SwiftUI
import WebKit

struct ContentView: View {
    @StateObject private var webViewState = WebViewState()
    
    var body: some View {
        VStack(spacing: 0) {
            // Burnt orange status bar area
            Color(red: 0.922, green: 0.369, blue: 0.129) // #eb5e21
                .frame(height: 0)
                .background(Color(red: 0.922, green: 0.369, blue: 0.129))
                .ignoresSafeArea(edges: .top)
            
            ZStack {
                WebView(url: URL(string: "https://dannywilson.info/flashcards.html")!, state: webViewState)
                
                if webViewState.isLoading {
                    Color(red: 0.051, green: 0.051, blue: 0.051)
                        .overlay(
                            VStack(spacing: 12) {
                                ProgressView()
                                    .tint(.white)
                                    .scaleEffect(1.2)
                                Text("Loading...")
                                    .foregroundColor(.gray)
                                    .font(.system(size: 14, weight: .bold))
                            }
                        )
                }
                
                if webViewState.hasError {
                    Color(red: 0.051, green: 0.051, blue: 0.051)
                        .overlay(
                            VStack(spacing: 16) {
                                Text("📡")
                                    .font(.system(size: 48))
                                Text("No Connection")
                                    .foregroundColor(.white)
                                    .font(.system(size: 18, weight: .bold))
                                Text("Check your internet and try again")
                                    .foregroundColor(.gray)
                                    .font(.system(size: 14))
                                Button("Retry") {
                                    webViewState.retry()
                                }
                                .padding(.horizontal, 24)
                                .padding(.vertical, 10)
                                .background(Color(red: 0.922, green: 0.369, blue: 0.129))
                                .foregroundColor(.white)
                                .font(.system(size: 14, weight: .bold))
                                .cornerRadius(20)
                            }
                        )
                }
            }
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

// MARK: - WebView State
class WebViewState: ObservableObject {
    @Published var isLoading = true
    @Published var hasError = false
    var webView: WKWebView?
    
    func retry() {
        hasError = false
        isLoading = true
        webView?.reload()
    }
}

// MARK: - WebView
struct WebView: UIViewRepresentable {
    let url: URL
    @ObservedObject var state: WebViewState

    func makeCoordinator() -> Coordinator {
        Coordinator(state: state)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.dataDetectorTypes = []

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.051, green: 0.051, blue: 0.051, alpha: 1.0)
        webView.scrollView.bounces = false
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = false
        
        state.webView = webView
        webView.load(URLRequest(url: url))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    class Coordinator: NSObject, WKNavigationDelegate {
        let state: WebViewState
        
        init(state: WebViewState) {
            self.state = state
        }
        
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            DispatchQueue.main.async {
                self.state.isLoading = false
                self.state.hasError = false
            }
        }
        
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            DispatchQueue.main.async {
                self.state.isLoading = false
                self.state.hasError = true
            }
        }
        
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            DispatchQueue.main.async {
                self.state.isLoading = false
                self.state.hasError = true
            }
        }
    }
}

#Preview {
    ContentView()
}
