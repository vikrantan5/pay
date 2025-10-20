import requests
import sys
import json
from datetime import datetime

class CodeMartAPITester:
    def __init__(self, base_url="https://codehub-20.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.user_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.product_id = None
        self.order_id = None
        self.coupon_id = None
        self.review_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Response: {response.json()}")
                except:
                    print(f"Response: {response.text}")

            return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@codemart.com", "password": "admin123"}
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"Admin token obtained: {self.admin_token[:20]}...")
            return True
        return False

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data={
                "name": f"Test User {timestamp}",
                "email": f"testuser{timestamp}@example.com",
                "password": "testpass123"
            }
        )
        if success and 'access_token' in response:
            self.user_token = response['access_token']
            print(f"User token obtained: {self.user_token[:20]}...")
            return True
        return False

    def test_get_products(self):
        """Test getting products list"""
        success, response = self.run_test(
            "Get Products",
            "GET",
            "products",
            200
        )
        return success

    def test_create_product(self):
        """Test creating a product (admin only)"""
        if not self.admin_token:
            print("❌ Admin token required")
            return False

        success, response = self.run_test(
            "Create Product",
            "POST",
            "admin/products",
            200,
            data={
                "title": "Test React App",
                "tagline": "A sample React application for testing",
                "description": "This is a comprehensive React application with modern features",
                "price": 99.99,
                "category": "Web App",
                "tags": ["react", "javascript", "frontend"],
                "tech_stack": ["React", "Node.js", "MongoDB"],
                "demo_url": "https://example.com/demo",
                "license_type": "Single-use",
                "is_published": True
            },
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        if success and 'id' in response:
            self.product_id = response['id']
            print(f"Product created with ID: {self.product_id}")
            return True
        return False

    def test_get_single_product(self):
        """Test getting a single product"""
        if not self.product_id:
            print("❌ Product ID required")
            return False

        success, response = self.run_test(
            "Get Single Product",
            "GET",
            f"products/{self.product_id}",
            200
        )
        return success

    def test_update_product(self):
        """Test updating a product (admin only)"""
        if not self.admin_token or not self.product_id:
            print("❌ Admin token and product ID required")
            return False

        success, response = self.run_test(
            "Update Product",
            "PUT",
            f"admin/products/{self.product_id}",
            200,
            data={
                "title": "Updated Test React App",
                "tagline": "An updated sample React application",
                "description": "This is an updated comprehensive React application",
                "price": 149.99,
                "category": "Web App",
                "tags": ["react", "javascript", "frontend", "updated"],
                "tech_stack": ["React", "Node.js", "MongoDB", "Redis"],
                "demo_url": "https://example.com/demo-updated",
                "license_type": "Multi-use",
                "is_published": True
            },
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        return success

    def test_create_coupon(self):
        """Test creating a coupon (admin only)"""
        if not self.admin_token:
            print("❌ Admin token required")
            return False

        success, response = self.run_test(
            "Create Coupon",
            "POST",
            "admin/coupons",
            200,
            data={
                "code": "TEST20",
                "discount_type": "percent",
                "discount_value": 20,
                "min_purchase": 50
            },
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        if success and 'id' in response:
            self.coupon_id = response['id']
            print(f"Coupon created with ID: {self.coupon_id}")
            return True
        return False

    def test_get_coupons(self):
        """Test getting coupons (admin only)"""
        if not self.admin_token:
            print("❌ Admin token required")
            return False

        success, response = self.run_test(
            "Get Coupons",
            "GET",
            "admin/coupons",
            200,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        return success

    def test_create_free_order(self):
        """Test creating a free order"""
        if not self.user_token or not self.product_id:
            print("❌ User token and product ID required")
            return False

        # First update product to be free
        if self.admin_token:
            self.run_test(
                "Make Product Free",
                "PUT",
                f"admin/products/{self.product_id}",
                200,
                data={
                    "title": "Free Test React App",
                    "tagline": "A free sample React application",
                    "description": "This is a free comprehensive React application",
                    "price": 0,
                    "category": "Web App",
                    "tags": ["react", "javascript", "frontend", "free"],
                    "tech_stack": ["React", "Node.js", "MongoDB"],
                    "demo_url": "https://example.com/demo",
                    "license_type": "Single-use",
                    "is_published": True
                },
                headers={"Authorization": f"Bearer {self.admin_token}"}
            )

        success, response = self.run_test(
            "Create Free Order",
            "POST",
            f"orders/create?product_id={self.product_id}",
            200,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        if success and 'order_id' in response:
            self.order_id = response['order_id']
            print(f"Free order created with ID: {self.order_id}")
            return True
        return False

    def test_get_my_orders(self):
        """Test getting user's orders"""
        if not self.user_token:
            print("❌ User token required")
            return False

        success, response = self.run_test(
            "Get My Orders",
            "GET",
            "orders/my-orders",
            200,
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        return success

    def test_create_review(self):
        """Test creating a review"""
        if not self.user_token or not self.product_id:
            print("❌ User token and product ID required")
            return False

        success, response = self.run_test(
            "Create Review",
            "POST",
            "reviews",
            200,
            data={
                "product_id": self.product_id,
                "rating": 5,
                "comment": "Excellent product! Highly recommended."
            },
            headers={"Authorization": f"Bearer {self.user_token}"}
        )
        if success and 'id' in response:
            self.review_id = response['id']
            print(f"Review created with ID: {self.review_id}")
            return True
        return False

    def test_get_product_reviews(self):
        """Test getting product reviews"""
        if not self.product_id:
            print("❌ Product ID required")
            return False

        success, response = self.run_test(
            "Get Product Reviews",
            "GET",
            f"reviews/{self.product_id}",
            200
        )
        return success

    def test_approve_review(self):
        """Test approving a review (admin only)"""
        if not self.admin_token or not self.review_id:
            print("❌ Admin token and review ID required")
            return False

        success, response = self.run_test(
            "Approve Review",
            "PUT",
            f"admin/reviews/{self.review_id}/approve",
            200,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        return success

    def test_get_all_reviews(self):
        """Test getting all reviews (admin only)"""
        if not self.admin_token:
            print("❌ Admin token required")
            return False

        success, response = self.run_test(
            "Get All Reviews",
            "GET",
            "admin/reviews",
            200,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        return success

    def test_get_analytics(self):
        """Test getting analytics (admin only)"""
        if not self.admin_token:
            print("❌ Admin token required")
            return False

        success, response = self.run_test(
            "Get Analytics",
            "GET",
            "admin/analytics",
            200,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        return success

    def test_get_all_orders(self):
        """Test getting all orders (admin only)"""
        if not self.admin_token:
            print("❌ Admin token required")
            return False

        success, response = self.run_test(
            "Get All Orders",
            "GET",
            "admin/orders",
            200,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        return success

    def test_delete_product(self):
        """Test deleting a product (admin only)"""
        if not self.admin_token or not self.product_id:
            print("❌ Admin token and product ID required")
            return False

        success, response = self.run_test(
            "Delete Product",
            "DELETE",
            f"admin/products/{self.product_id}",
            200,
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        return success

def main():
    print("🚀 Starting CodeMart API Testing...")
    tester = CodeMartAPITester()

    # Authentication Tests
    print("\n" + "="*50)
    print("AUTHENTICATION TESTS")
    print("="*50)
    
    if not tester.test_admin_login():
        print("❌ Admin login failed, stopping tests")
        return 1
    
    if not tester.test_user_registration():
        print("❌ User registration failed, stopping tests")
        return 1

    # Product Tests
    print("\n" + "="*50)
    print("PRODUCT TESTS")
    print("="*50)
    
    tester.test_get_products()
    tester.test_create_product()
    tester.test_get_single_product()
    tester.test_update_product()

    # Coupon Tests
    print("\n" + "="*50)
    print("COUPON TESTS")
    print("="*50)
    
    tester.test_create_coupon()
    tester.test_get_coupons()

    # Order Tests
    print("\n" + "="*50)
    print("ORDER TESTS")
    print("="*50)
    
    tester.test_create_free_order()
    tester.test_get_my_orders()

    # Review Tests
    print("\n" + "="*50)
    print("REVIEW TESTS")
    print("="*50)
    
    tester.test_create_review()
    tester.test_get_product_reviews()
    tester.test_approve_review()
    tester.test_get_all_reviews()

    # Admin Tests
    print("\n" + "="*50)
    print("ADMIN TESTS")
    print("="*50)
    
    tester.test_get_analytics()
    tester.test_get_all_orders()

    # Cleanup
    print("\n" + "="*50)
    print("CLEANUP TESTS")
    print("="*50)
    
    tester.test_delete_product()

    # Print results
    print("\n" + "="*50)
    print("TEST RESULTS")
    print("="*50)
    print(f"📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"📈 Success rate: {success_rate:.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())